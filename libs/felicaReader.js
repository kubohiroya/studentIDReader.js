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

var pafe = require('../node_modules/node-libpafe/build/Release/pafe');

require('../libs/util/stringUtil.js');
require('../libs/util/dateUtil.js');
require('../libs/util/arrayUtil.js');

var lib = {
    Session: require('../libs/session.js').Session
};


var FelicaReader = function (config) {

    this.config = config;

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

    if (felicaReader.config.enrollment_filename) {
        this.startServers(this.config.NET.HTTP_PORT, this.config.NET.WS_PORT, function () {
            felicaReader.session = new lib.Session(felicaReader.config,
                felicaReader.websocketServer,
                felicaReader.config.enrollment_filename);
        });
        felicaReader.startReaders();
    } else {
        this.startServers(this.config.NET.HTTP_PORT, this.config.NET.WS_PORT);
    }
};

FelicaReader.prototype.stop = function () {};

FelicaReader.prototype.startServers = function (http_port, ws_port, callback) {
    // WebServerを起動
    var app = express();
    app.configure(function () {
        app.use(express.static(__dirname + "/../views/"));
        app.use(express.methodOverride());
        app.use(express.bodyParser({
            keepExtensions: true
        }));
    });
    app.post('/upload', function (req, res) {
        var uploaded_file_path = req.files.imagefile.path;
        res.send('File uploaded to: ' + uploaded_file_path + ' - ' + req.files.imagefile.size + ' bytes');
        felicaReader.session = new lib.Session(this.config,
            this.websocketServer,
            uploaded_file_path);
        felicaReader.session.initClientView();
        felicaReader.startReaders();
    });

    var server = http.createServer(app);
    var felicaReader = this;

    server.listen(http_port, function () {});

    felicaReader.websocketServer = websocket.listen(ws_port, function () {
        felicaReader.websocketServer.on("connection", function (socket) {
            console.log("new ws connection.");
            if (felicaReader.session) {
                felicaReader.session.initClientView(socket);
            }
        });
    });

    if (callback) {
        callback();
    }

    if (this.config.APP.AUTO_LAUNCH_BROWSER) {
        open('http://localhost:' + http_port);
    }

};

FelicaReader.prototype.startReaders = function () {

    if (this.config.APP.HAVE_PASORI) {
        this.pasoriArray = pafe.open_pasori_multi();
        if (!this.pasoriArray) {
            console.log("[FATAL ERROR] fail to open pasori.");
            return;
        }
        for (var i = 0; i < this.pasoriArray.length; i++) {
            var pasori = this.pasoriArray[i];
            pasori.init();
            pasori.set_timeout(this.config.PASORI.TIMEOUT);
        }

        this.polling(); //この関数の呼び出しはブロックする

    } else {
        // code for demonstration in no pasori environment.
        var pasori_index = 0;
        var id_code = this.config.DUMMY_ID_CODE;
        this.session.on_read(pasori_index, id_code, this.lecture);
        process.exit();

    }
};

/**
   この関数内で、FeliCaのポーリング、IDコードの読み出し、処理を行う。
   この関数内で読み取りループが行われるので、呼び出しはブロックする。
*/
FelicaReader.prototype.polling = function () {

    this.enabled = true;

    if (!this.pasoriArray) {
        throw "ERROR: pasoriArray == NULL.";
    }

    console.log('start_polling');

    var interval = 100;
    var felicaReader = this;

    setInterval(function () {

        var DEBUG = true;

        if (!felicaReader.enabled) {
            console.log("felicaReader is disabled.");
            return;
        }

        if (!felicaReader.session) {
            console.log("felicaReader.session is not initialized.");
            return;
        }

        for (var pasori_index = 0; pasori_index < felicaReader.pasoriArray.length; pasori_index++) {
            var pasori = felicaReader.pasoriArray[pasori_index];

            if (!pasori) {
                console.log("\nPaSoRi ERROR.");
                felicaReader.enabled = false;
                pasori.close();
                process.exit();
            }

            var felica;
            try {
                pasori.reset();
                pasori.set_timeout(100);
                if (DEBUG) {
                     console.log("ON POLLING....");
                }
                console.log("on_polling");
                felicaReader.session.on_polling(pasori_index);

                felica = pasori.polling(felicaReader.config.FELICA.SYSTEM_CODE.FELICA_LITE,
                    felicaReader.config.FELICA.POLLING_TIMESLOT);

                if (DEBUG) {
                    console.log("  READ_SINGLE....");
                }
                var data = felica.read_single(felicaReader.config.CARDREADER.SERVICE_CODE,
                    0,
                    felicaReader.config.CARDREADER.ID_INFO.BLOCK_NUM);
                if (DEBUG) {
                    console.log("    DONE....");
                }
                if (data) {

                    /*var pmm = felica.get_pmm().toHexString();*/

                    var id_code = data.substring(felicaReader.config.CARDREADER.ID_INFO.BEGIN_AT,
                        felicaReader.config.CARDREADER.ID_INFO.END_AT);

                    if (id_code.endsWith("_")) {
                        id_code = id_code.substring(0, id_code.length - 1);
                    }

                    if (DEBUG) {
                        console.log("  id_code " + id_code);
                    }

                    felicaReader.session.on_read(pasori_index, id_code, felicaReader.lecture, this.config.CARDREADER.CHECK_TEACHER_IDCARD);
                }
            } catch (e) {

                //console.log(" ERROR=" + pasori.get_error_code());

                felicaReader.session.on_idle(pasori_index);

            } finally {
                if (felica) {
                    felica.close();
                    felica = undefined;
                }
                console.log('.');
            }
        }

    }, interval);
};


exports.FelicaReader = FelicaReader;