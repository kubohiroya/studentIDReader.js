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

/* PaSoRi/FeliCaの設定 */
var FELICA = {
    TIMEOUT: 100,
    POLLING_TIMESLOT: 0,
    SYSTEM_CODE: {
        ANY: 0xFFFF,
        FELICA_LITE: 0x88B4
    }
};

/* 学生証リーダーの設定 */
var CARDREADER = {
    SERVICE_CODE: 0x000B,
    CHECK_ORDER_TEACHER_STUDENT: false,
    ID_INFO: {
        BLOCK_NUM: 0x8004,
        PREFIX: '01',
        BEGIN_AT: 2,
        END_AT: 9
    }
};

var Reader = function(){};

var readerArray;
var pollingCount = 0;

Reader.prototype.startReaders = function (deviceType) {
    var deviceModule;
    console.log('[INFO] initialize deviceType = '+deviceType);
    if(deviceType === 'pafe') {
        deviceModule = require('../node_modules/node-libpafe/build/Release/pafe');
    }else if(deviceType == 'dummy') {
        deviceModule = require('../lib/dummy.js').pafe;
    }else{
        console.log('[FATAL] unknown deviceType:'+deviceType);
        process.exit(-1);
    }
    try{
        readerArray = deviceModule.open_pasori_multi();
    }catch(err){
        try{
            var reader = deviceModule.open_pasori_single();
            readerArray = [reader];
        }catch(err){
            console.log("[FATAL] reader init error: "+JSON.stringify(err));
            process.exit();
        }
    }

    if (!readerArray) {
        console.log("[FATAL] fail to open reader.");
        process.exit();
    }
    for (var i = 0; i < readerArray.length; i++) {
        var reader = readerArray[i];
        reader.init();
        reader.set_timeout(FELICA.TIMEOUT);
    }

    polling();
};

/**
   この関数内で、FeliCaのポーリング、IDコードの読み出し、処理を行う。
   この関数内で読み取りループが行われるので、呼び出しはブロックする。
*/
var polling = function () {

    var interval = 50;
    var p = this;

    var DEBUG = false;
    if (!readerArray) {
        console.log("[ERROR] readerArray == NULL.");
        process.exit();
    }

    if (DEBUG) {
        console.log('*');
    }

    for (var readerIndex = 0; readerIndex < readerArray.length; readerIndex++) {
        var reader = readerArray[readerIndex];

        if (!reader) {
            console.log("\n[ERROR] Reader init error.");
            reader.close();
            process.exit();
        }

        var felica;
        try {
            reader.reset();
            reader.set_timeout(FELICA.TIMEOUT);
            if (DEBUG) {
                console.log("ON POLLING...."+pollingCount);
            }

            process.send({
                    command:"onPolling",
                        readerIndex: readerIndex
                        });

            felica = reader.polling(FELICA.SYSTEM_CODE.FELICA_LITE,
                                    FELICA.POLLING_TIMESLOT);

            if (DEBUG) {
                console.log("  READ.... "+pollingCount);
            }
            var data = felica.read_single( CARDREADER.SERVICE_CODE,
                                           0,
                                           CARDREADER.ID_INFO.BLOCK_NUM);
            if (DEBUG) {
                console.log("    DONE.... "+ data);
            }
            if (data !== undefined) {
                /*var pmm = felica.get_pmm().toHexString();*/
                var studentID = data.substring( CARDREADER.ID_INFO.BEGIN_AT,
                                              CARDREADER.ID_INFO.END_AT);
                while (studentID.lastIndexOf("_") === studentID.length - 1) {
                    studentID = studentID.substring(0, studentID.length - 1);
                }
                if (DEBUG) {
                    console.log("  ID_CODE " + studentID);
                }
                process.send({
                        command: "onRead",
                            readerIndex: readerIndex,
                            studentID: studentID
                            });
            }
        } catch (e) {
            process.send({
                    command: "onIdle",
                    readerIndex: readerIndex
                });
        } finally {
            if (felica) {
                felica.close();
                felica = undefined;
            }
            if(reader.get_error_code() === 103){
                console.log("\n[ERROR] Reader device error.");
                reader.close();
                process.exit();
            }
            if (DEBUG) {
                console.log('.');
            }
            pollingCount++;
        }
    }

    //console.log("pc="+pollingCount);
    //setImmediate(polling);

    setTimeout(polling, interval);

};

process.on('message', function (json) {
        var message = JSON.parse(json);
        if(message.command === 'start' && message.deviceType){
            new Reader().startReaders(message.deviceType);
        }else{
            console.log('[ERROR] unknown message: ' + json);
        }
});


