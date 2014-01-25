/*
  FeliCa Student ID card reader to check attendee
  Copyright (c) 2013 Hiroya Kubo <hiroya@cuc.ac.jp>

  Permission is hereby granted, free of charge, to any person obtaining
  a copy of this software and associated documentation files (the
  "Software"), to deal in the Software without restriction, including
  without limitation the rights to use, copy, modify, merge, publish,
  distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so, subject to
  the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/* jslint node: true */
"use strict";

var open = require('open');
var http = require('http');
var WebSocketServer = require("ws").Server;
var express = require('express');
var fs = require('fs');
var cp = require('child_process');

require('../lib/util/stringUtil.js');
require('../lib/util/dateUtil.js');
require('../lib/util/arrayUtil.js');
var netUtil = require('../lib/util/netUtil.js').netUtil;
var Session = require('../lib/session.js').Session;

var ViewUpdater = require('../lib/viewUpdater.js').ViewUpdater;


function eventHandlersFactory(session) {
    return [new ViewUpdater(session.websocketServer)];
}

var ReaderKernel = function (program, teacherDB, lecture, enrollmentDB, attendeeDir, attendeeFilenameBase, loadTeacherFunc, loadEnrollmentFunc) {

    this.program = program;

    this.teacherDB = teacherDB;
    this.lecture = lecture;
    this.enrollmentDB = enrollmentDB;
    this.attendeeDir = attendeeDir;

    this.attendeeFilenameBase = attendeeFilenameBase;

    this.loadEnrollmentFunc = loadEnrollmentFunc;
    this.loadTeacherFunc = loadTeacherFunc;

    this.serverSessionKey = Math.floor(Math.random() * 65536 * 65536);
};

ReaderKernel.prototype.start = function () {

    var felicaReader = this;

    this.startServers(function () {
        if (felicaReader.lecture) {
            felicaReader.session = new Session(felicaReader.websocketServer,
                felicaReader.teacherDB,
                felicaReader.lecture,
                felicaReader.enrollmentDB,
                felicaReader.attendeeDir,
                felicaReader.attendeeFilenameBase,
                felicaReader.program.group,
                felicaReader.program.interval,
                eventHandlersFactory);
        }
    });
};

ReaderKernel.prototype.stop = function () {};

ReaderKernel.prototype.startServers = function (callback) {

    var felicaReader = this;
    var nodeEnv = 'development';

    // WebServerを起動
    var app = express();
    app.configure(nodeEnv, function () {
        app.use(express.static(__dirname + '/../views/'));
        app.use(express.methodOverride());
        app.use(express.errorHandler());
        app.use(express.bodyParser({
            keepExtensions: true
        }));
        app.use(express.urlencoded());
        app.use(express.json());
    });

    console.log('[INFO] [WebSocket] listening on port ' + this.program.wsport);

    this.websocketServer = new WebSocketServer({
        port: parseInt(this.program.wsport)
    });

    this.websocketServer.on('connection', function (socket) {
        console.log('[INFO] [WebSocket] new connection.');
        socket.on('message', function (message) {
            var json = JSON.parse(message);
            var clientSessionKey = parseInt(json.sessionKey);
            if (clientSessionKey == felicaReader.serverSessionKey) {
                socket.authorized = true;
            }
        });

        socket.on('close', function () {
            console.log('[INFO] [WebSocket] close connection.');
        });

        socket.on('error', function (error) {
            console.log('[ERROR] [WebSocket] error from client: ' + error);
        });

        if (felicaReader.session) {
            setTimeout(function () {
                felicaReader.session.startUpClientView(socket);
            }, 100);
        }

    });

    app.post('/upload', function (req, res) {
        if (felicaReader.session) {
            res.send('[WARN] this server is already initialized.');
            return;
        }
        var uploadedFilePath = req.files.files.path;
        res.send('File uploaded to: ' + uploadedFilePath + ' - ' + req.files.files.size + ' bytes');
        var enrollment = felicaReader.loadEnrollmentFunc(uploadedFilePath);

        felicaReader.lecture = enrollment.lecture;
        felicaReader.enrollmentDB = enrollment.enrollmentDB;
        felicaReader.session = new Session(felicaReader.websocketServer,
            felicaReader.teacherDB,
            felicaReader.lecture,
            felicaReader.enrollmentDB,
            felicaReader.attendeeDir,
            felicaReader.attendeeFilenameBase,
            felicaReader.program.group,
            felicaReader.program.interval,
            eventHandlersFactory);

        felicaReader.session.startUpClientView();
    });

    var server = http.createServer(app);

    server.listen(parseInt(this.program.httpport), function () {
        console.log('[INFO] [HTTPD] listening on port ' + felicaReader.program.httpport);
        var address = netUtil.getAddress();
        var url = 'http://' + address + ':' + server.address().port + '/?key=' + felicaReader.serverSessionKey + '&mode=admin';
        console.log('[INFO] Open the URL below in a browser to connect:');
        console.log('       ' + url);
        if (!felicaReader.program.disableAutoLaunchBrowser) {
            open(url);
        }
        if (callback) {
            callback();
        }
    });

    server.on('error', function (error) {
        console.log('[ERROR]');
    });

    felicaReader.startReaders();
};

ReaderKernel.prototype.startReaders = function () {
    var felicaReader = this;

    var readerProcess = cp.fork(__dirname + '/reader.js');

    readerProcess.send(JSON.stringify({
        command: 'start',
        deviceType: this.program.device
    }));

    readerProcess.on('message', function (m) {
        if (!felicaReader.session) {
            //                console.log('felicaReader.session is undefined.');
            return;
        }

        if (m.command == 'onPolling') {
            felicaReader.session.onPolling(m.readerIndex);
        } else if (m.command == 'onIdle') {
            felicaReader.session.onIdle(m.readerIndex);
        } else if (m.command == 'onRead') {
            felicaReader.session.onRead(m.readerIndex, m.userID, true);
        } else {
            console.log('[WARN] parent got message: ', m);
        }
    });

    readerProcess.on('exit', function (code, signal) {
        console.log('[FATAL] exit code: ' + code);
        setInterval(function () {
            new Session.showReaderErrorMessage();
            setInterval(function () {
                process.exit(code);
            }, 500);
        }, 500);
    });
};

exports.ReaderKernel = ReaderKernel;