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

var ReaderKernel = function (program, teacher_db, lecture, enrollment_db, attendee_dir, attendee_filename_base, loadTeacherFunc, loadEnrollmentFunc) {

    this.program = program;

    this.teacher_db = teacher_db;
    this.lecture = lecture;
    this.enrollment_db = enrollment_db;
    this.attendee_dir = attendee_dir;

    this.attendee_filename_base = attendee_filename_base;

    this.loadEnrollmentFunc = loadEnrollmentFunc;
    this.loadTeacherFunc = loadTeacherFunc;

    this.serverSessionKey = Math.floor(Math.random() * 65536 * 65536);
};

ReaderKernel.prototype.start = function () {

    var felicaReader = this;

    this.startServers(function () {
        if (felicaReader.lecture) {
            felicaReader.session = new Session(felicaReader.teacher_db,
                felicaReader.lecture,
                felicaReader.enrollment_db,
                felicaReader.attendee_dir,
                felicaReader.attendee_filename_base,
                felicaReader.program.group,
                felicaReader.program.interval,
                felicaReader.websocketServer);
        }
    });
};

ReaderKernel.prototype.stop = function () {};

ReaderKernel.prototype.startServers = function (callback) {

    var felicaReader = this;
    var node_env = 'development';

    // WebServerを起動
    var app = express();
    app.configure(node_env, function () {
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
        var uploaded_file_path = req.files.files.path;
        res.send('File uploaded to: ' + uploaded_file_path + ' - ' + req.files.files.size + ' bytes');
        var enrollment = felicaReader.loadEnrollmentFunc(uploaded_file_path);

        felicaReader.lecture = enrollment.lecture;
        felicaReader.enrollment_db = enrollment.enrollment_db;
        felicaReader.session = new Session(felicaReader.teacher_db,
            felicaReader.lecture,
            felicaReader.enrollment_db,
            felicaReader.attendee_dir,
            felicaReader.attendee_filename_base,
            felicaReader.program.group,
            felicaReader.program.interval,
            felicaReader.websocketServer);

        felicaReader.session.startUpClientView();
    });

    var server = http.createServer(app);

    server.listen(parseInt(this.program.httpport), function () {
        console.log('[INFO] [HTTPD] listening on port ' + felicaReader.program.httpport);
        var address = netUtil.get_address();
        var url = 'http://' + address + ':' + server.address().port + '/?key=' + felicaReader.serverSessionKey + '&mode=admin';
        if (!felicaReader.program.disableAutoLaunchBrowser) {
            open(url);
        }else{
            console.log('[INFO] Open the URL below in a browser to connect:');
            console.log('       '+url);
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

    var reader_process = cp.fork(__dirname + '/reader.js');

    reader_process.send(JSON.stringify({
        command: 'start',
        device_type: this.program.device
    }));

    reader_process.on('message', function (m) {
        if (!felicaReader.session) {
            //                console.log('felicaReader.session is undefined.');
            return;
        }

        if (m.command == 'on_polling') {
            felicaReader.session.on_polling(m.reader_index);
        } else if (m.command == 'on_idle') {
            felicaReader.session.on_idle(m.reader_index);
        } else if (m.command == 'on_read') {
            felicaReader.session.on_read(m.reader_index, m.id_code, true);
        } else {
            console.log('[WARN] parent got message: ', m);
        }
    });

    reader_process.on('exit', function (code, signal) {
        console.log('[FATAL] exit code: ' + code);
        setInterval(function () {
            Session.showReaderErrorMessage(felicaReader.websocketServer);
            setInterval(function () {
                process.exit(code);
            }, 500);
        }, 500);
    });
};

exports.ReaderKernel = ReaderKernel;