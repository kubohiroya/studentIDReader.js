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

var FelicaReader = function (config, teacher_db, lecture, enrollment_db, attend_dir, loadTeacherFunc, loadEnrollmentFunc) {

    this.config = config;
    this.teacher_db = teacher_db;
    this.lecture = lecture;
    this.enrollment_db = enrollment_db;
    this.attend_dir = attend_dir;

    this.loadEnrollmentFunc = loadEnrollmentFunc;
    this.loadTeacherFunc = loadTeacherFunc;

    this.serverSessionKey = Math.floor(Math.random()*65536*65536);
};

FelicaReader.prototype.start = function () {

    var felicaReader = this;

    this.startServers(this.config.NET.HTTP_PORT, this.config.NET.WS_PORT, function () {
        if (felicaReader.lecture) {
            felicaReader.session = new Session(felicaReader.config,
                                                   felicaReader.teacher_db,
                                                   felicaReader.lecture,
                                                   felicaReader.enrollment_db,
                                                   felicaReader.attend_dir,
                                                   felicaReader.websocketServer);
        }
    });
};

FelicaReader.prototype.stop = function () {};

FelicaReader.prototype.startServers = function (http_port, ws_port, callback) {

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
    });

    this.websocketServer = new WebSocketServer({
            port: ws_port
        });

    this.websocketServer.on('connection', function (socket) {
        console.log('[new] ws connection.');
        socket.on('message', function(value){
                var clientSessionKey = parseInt(value);
                if(clientSessionKey == felicaReader.serverSessionKey){
                    socket.authorized = true;
                }
        });

        socket.on('close', function(){
            console.log('[close] ws connection.');
        });

        socket.on('error', function(error){
            console.log('[error] ws connection.'+error);
        });

        if (felicaReader.session) {
            setTimeout(function(){
                    felicaReader.session.startUpClientView(socket);
                }, 100);
        }

    });

    app.post('/upload', function (req, res) {
        if (felicaReader.session) {
            res.send('this server is already initialized.');
            return;
        }
        var uploaded_file_path = req.files.files.path;
        res.send('File uploaded to: ' + uploaded_file_path + ' - ' + req.files.files.size + ' bytes');
        var enrollment = felicaReader.loadEnrollmentFunc(uploaded_file_path);
        felicaReader.lecture = enrollment.lecture;
        felicaReader.enrollment_db = enrollment.enrollment_db;
        felicaReader.session = new Session(felicaReader.config,
                                               felicaReader.teacher_db,
                                               felicaReader.lecture,
                                               felicaReader.enrollment_db,
                                               felicaReader.attend_dir, 
                                               felicaReader.websocketServer);
        felicaReader.session.startUpClientView();
    });

    var server = http.createServer(app);

    server.listen(http_port, function () {
        console.log('httpd listening on port ' + http_port);
        if (felicaReader.config.APP.AUTO_LAUNCH_BROWSER) {
            var address = netUtil.get_address();
            var url = 'http://' + address + ':' + server.address().port + '/?key=' + felicaReader.serverSessionKey + '&mode=admin';
            open(url);
        }
        if (callback) {
            callback();
        }
    });

    server.on('error', function(error){
        console.log('[error]');
    });

    felicaReader.startReaders();
};

FelicaReader.prototype.startReaders = function () {
    var felicaReader = this;
    if(this.config.APP.HAVE_PASORI){
        var pasori_process = cp.fork(__dirname + '/pasori.js');
        pasori_process.on('message', function (m) {
            if ( ! felicaReader.session) {
//                console.log('felicaReader.session is undefined.');
                return;
            }

            if (m.command == 'on_polling') {
                felicaReader.session.on_polling(m.pasori_index);
            } else if (m.command == 'on_idle') {
                felicaReader.session.on_idle(m.pasori_index);
            } else if (m.command == 'on_read') {
                felicaReader.session.on_read(m.pasori_index, m.id_code, true);
            } else {
                console.log('[WARN] parent got message: ', m);
            }
        });

        pasori_process.on('exit', function (code, signal) {
            console.log('[FATAL] exit code: ' + code);
            setInterval(function(){
                    Session.showPaSoRiErrorMessage(felicaReader.websocketServer);
                    setInterval(function(){
                            process.exit(code);
                        }, 500);
                }, 500);
        });

    }else{
        setInterval(function(){
            if(felicaReader.session){
                felicaReader.session.on_idle(0);
            }
        }, 1000);
    }
};

exports.FelicaReader = FelicaReader;
