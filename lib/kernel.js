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

var bodyParser = require('body-parser')

var fs = require('fs');
var cp = require('child_process');

require('../lib/util/stringUtil.js');
require('../lib/util/dateUtil.js');
require('../lib/util/arrayUtil.js');
var netUtil = require('../lib/util/netUtil.js').netUtil;
var Session = require('../lib/session.js').Session;

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

    var kernel = this;

    this.startServers(function () {
        if (kernel.lecture) {
            kernel.session = new Session(kernel.websocketServer,
                kernel.teacherDB,
                kernel.lecture,
                kernel.enrollmentDB,
                kernel.attendeeDir,
                kernel.attendeeFilenameBase,
                kernel.program.group,
                kernel.program.interval);
        }
    });
};

ReaderKernel.prototype.stop = function () {};

ReaderKernel.prototype.startServers = function (callback) {

    var kernel = this;
   // var nodeEnv = 'development';

    // WebServerを起動
    var app = express();
    app.use(express.static(__dirname + '/../views/'));
    // app.use(express.methodOverride());
    // app.use(express.errorHandler());
    app.use(bodyParser.urlencoded({
         extended: true
        }));
    app.use(bodyParser.json());
      console.log('[INFO] [WebSocket] listening on port ' + this.program.wsport);

    this.websocketServer = new WebSocketServer({
        port: parseInt(this.program.wsport)
    });

    this.websocketServer.on('connection', function (socket) {
        console.log('[INFO] [WebSocket] new connection.');
        socket.on('message', function (message) {
            var json = JSON.parse(message);
            var clientSessionKey = parseInt(json.sessionKey);
            if (clientSessionKey == kernel.serverSessionKey) {
                socket.authorized = true;
            }
        });

        socket.on('close', function () {
            console.log('[INFO] [WebSocket] close connection.');
        });

        socket.on('error', function (error) {
            console.log('[ERROR] [WebSocket] error from client: ' + error);
        });

        if (kernel.session) {
            setTimeout(function () {
                kernel.session.startUpClientView(socket);
            }, 100);
        }

    });

    app.post('/upload', function (req, res) {
        if (kernel.session) {
            res.send('[WARN] this server is already initialized.');
            return;
        }
        var uploadedFilePath = req.files.files.path;
        res.send('File uploaded to: ' + uploadedFilePath + ' - ' + req.files.files.size + ' bytes');
        var enrollment = kernel.loadEnrollmentFunc(uploadedFilePath, kernel.program.encoding);

        kernel.lecture = enrollment.lecture;
        kernel.enrollmentDB = enrollment.enrollmentDB;
        kernel.session = new Session(kernel.websocketServer,
            kernel.teacherDB,
            kernel.lecture,
            kernel.enrollmentDB,
            kernel.attendeeDir,
            kernel.attendeeFilenameBase,
            kernel.program.group,
            kernel.program.interval);

        kernel.session.startUpClientView();
    });

    var server = http.createServer(app);

    server.listen(parseInt(this.program.httpport), function () {
        console.log('[INFO] [HTTPD] listening on port ' + kernel.program.httpport);
        var address = netUtil.getAddress();
        var url = 'http://' + address + ':' + server.address().port + '/?key=' + kernel.serverSessionKey + '&mode=admin';
        console.log('[INFO] Open the URL below in a browser to connect:');
        console.log('       ' + url);
        if (!kernel.program.disableAutoLaunchBrowser) {
            open(url);
        }
        if (callback) {
            callback();
        }
    });

    server.on('error', function (error) {
        console.log('[ERROR]');
    });

    kernel.startReaders();
    //kernel.startReadersLixin();
};

ReaderKernel.prototype.startReadersLixin = function () {

    var CSVDB = require('./csvdb.js').CSVDB;
    var events = require('events');
    var NFC = require('../node_modules/nfc/build/Release/nfc').NFC;

    console.log('<nfc>');

    function toHexString(arr){
        var ret = '';
        for(var i = 0; i<arr.length; i++){
            ret += Math.floor(arr[i] / 16).toString(16);
            ret += (arr[i] % 16).toString(16);
        }
        return ret;
    };

    function inherits(target, source) {
        for (var k in source.prototype) {
            target.prototype[k] = source.prototype[k];
        }
    }

    inherits(NFC, events.EventEmitter);

    var FIELD_KEYS = ['uid','userID'];
    var FIELD_SEPARATOR = ',';
    var ENCODING = 'utf-8';

    var filename = 'lixin/lixin2014-2-uid.csv';
    console.log('read db:', filename);

    var uidDB = new CSVDB(filename, FIELD_KEYS, FIELD_SEPARATOR, ENCODING, 
                           function(fileEntry){
                               return fileEntry;
                           },
                           function(entry){
                               return entry.uid;
                           });

    console.log('read db done:'+uidDB.keys().length);

    var kernel = this;

    this.nfc = new NFC();

    this.nfc.on('uid', function(uid){
            var uidstr = toHexString(uid)
                //var user = uidDB.get(uidstr);
             var user = new User('hogehoge','name','name',0);
            if(user){
                var userID = user.userID;
                kernel.session.onRead(0, userID, true);
                //console.log("valid UID:", uidstr);
            }else{
                //console.log("unknown UID:", uidstr);
            }
        });
    this.nfc.start();
}

ReaderKernel.prototype.startReaders = function () {
    var kernel = this;

    var readerProcess = cp.fork(__dirname + '/reader.js');

    readerProcess.send(JSON.stringify({
        command: 'start',
        deviceType: this.program.device
    }));

    readerProcess.on('message', function (m) {
        if (!kernel.session) {
            //                console.log('kernel.session is undefined.');
            return;
        }

        if (m.command == 'onPolling') {
            kernel.session.onPolling(m.readerIndex);
        } else if (m.command == 'onIdle') {
            kernel.session.onIdle(m.readerIndex);
        } else if (m.command == 'onRead') {
            kernel.session.onRead(m.readerIndex, m.userID, true);
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
