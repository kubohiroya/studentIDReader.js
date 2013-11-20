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
var websocket = require("websocket.io");
var express = require('express');
var fs = require('fs');
var cp = require('child_process');

require('../lib/util/stringUtil.js');
require('../lib/util/dateUtil.js');
require('../lib/util/arrayUtil.js');

var lib = {
    Session: require('../lib/session.js').Session,
};

var FelicaReader = function (config, teacher_db, lecture, student_db, loadTeacherFunc, loadEnrollmentFunc) {

    this.config = config;
    this.teacher_db = teacher_db;
    this.lecture = lecture;
    this.student_db = student_db;
    
    console.log("FelicaReader: ", this);
    
    this.loadEnrollmentFunc = loadEnrollmentFunc;
    this.loadTeacherFunc = loadTeacherFunc;
    
    /*
    if (config.APP.CATCH_SIGINT) {
        process.on('SIGINT', function () {
            console.log("\ngracefully shutting down from  SIGINT (Crtl-C)");
            cardreader.enabled = false;
            process.exit();
        });
    }*/

};

FelicaReader.prototype.start = function () {

    var felicaReader = this;

    this.startServers(this.config.NET.HTTP_PORT, this.config.NET.WS_PORT, function () {
        if (felicaReader.lecture) {
            felicaReader.session = new lib.Session(felicaReader.config,
                                                   felicaReader.teacher_db,
                                                   felicaReader.lecture,                            
                                                   felicaReader.student_db,
                                                   felicaReader.websocketServer);
        }
    });
};

FelicaReader.prototype.stop = function () {};

FelicaReader.prototype.startServers = function (http_port, ws_port, callback) {

    var felicaReader = this;

    // WebServerを起動
    var app = express();
    app.configure(function () {
        app.use(express.static(__dirname + "/../views/"));
        app.use(express.methodOverride());
        app.use(express.bodyParser({
            keepExtensions: true
        }));
    });

    this.websocketServer = websocket.listen(ws_port, function () {
        this.on("connection", function (socket) {
            console.log("new ws connection.");
            if (felicaReader.session) {
                setTimeout(function () {
                    felicaReader.session.initClientView();
                }, 500);
            }
        });
    });

    app.post('/upload', function (req, res) {
        if (felicaReader.session) {
            res.send('this server has been initialized.');
            return;
        }
        var uploaded_file_path = req.files.files.path;
        res.send('File uploaded to: ' + uploaded_file_path + ' - ' + req.files.files.size + ' bytes');
        var enrollment_db = felicaReader.loadEnrollmentFunc(uploaded_file_path);
        felicaReader.lecture = enrollment_db.lecture;
        felicaReader.student_db = enrollment_db.student_db;
        felicaReader.session = new lib.Session(felicaReader.config,
                                               felicaReader.teacher_db,
                                               felicaReader.lecture,
                                               felicaReader.student_db,
                                               felicaReader.websocketServer);
        felicaReader.session.initClientView();
    });

    var server = http.createServer(app);

    server.listen(http_port, function () {
        console.log("httpd listening on port " + http_port);
        if (felicaReader.config.APP.AUTO_LAUNCH_BROWSER) {
            open('http://localhost:' + http_port);
        }
        if (callback) {
            callback();
        }
    });

    felicaReader.startReaders();
};

FelicaReader.prototype.startReaders = function () {
    var felicaReader = this;
    var pasori_process = cp.fork(__dirname + '/pasori.js');
    pasori_process.on('message', function (m) {
        if (!felicaReader.session) {
            console.log('felicaReader.session is undefined.');
            return;
        }

        if (m.command == 'on_polling') {
            felicaReader.session.on_polling(m.pasori_index);
        } else if (m.command == 'on_idle') {
            felicaReader.session.on_idle(m.pasori_index);
        } else if (m.command == 'on_read') {
            felicaReader.session.on_read(m.pasori_index, m.id_code, true);
        }else{
            console.log('[WARN] parent got message: ', m);
        }
    });
    pasori_process.on('exit', function (code, signal) {
        console.log("[FATAL] exit code: " + code);
        process.exit(code);
    });
};

exports.FelicaReader = FelicaReader;