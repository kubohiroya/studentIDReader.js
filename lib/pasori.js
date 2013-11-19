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

var pafe = require('../node_modules/node-libpafe/build/Release/pafe');

/* PaSoRi/FeliCaの設定 */
var FELICA = {
    TIMEOUT: 150,
    POLLING_TIMESLOT: 0,
    SYSTEM_CODE: {
        ANY: 0xFFFF,
        FELICA_LITE: 0x88B4
    },
    READ_DELAY: 3000
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
    
var PaSoRi = function(){};

PaSoRi.prototype.startReaders = function () {

    try{
        this.pasoriArray = pafe.open_pasori_multi();
    }catch(err){
        console.log("[FATAL] pasori init error.");
        process.exit();
    }
    if (!this.pasoriArray) {
        console.log("[FATAL] fail to open pasori.");
        process.exit();
        return;
    }
    for (var i = 0; i < this.pasoriArray.length; i++) {
        var pasori = this.pasoriArray[i];
        pasori.init();
        pasori.set_timeout(FELICA.TIMEOUT);
    }

    this.polling(); //この関数の呼び出しはブロックする
};

/**
   この関数内で、FeliCaのポーリング、IDコードの読み出し、処理を行う。
   この関数内で読み取りループが行われるので、呼び出しはブロックする。
*/
PaSoRi.prototype.polling = function () {

    var interval = 100;
    var pasori_timeout = 1000;
    var p = this;
    
    var DEBUG = false;
    
    if (!this.pasoriArray) {
        console.log("[ERROR] pasoriArray == NULL.");
        process.exit();
    }

    if(DEBUG){
        console.log('start_polling');
    }

    setInterval(function () {
        
        for (var pasori_index = 0; pasori_index < p.pasoriArray.length; pasori_index++) {
            var pasori = p.pasoriArray[pasori_index];

            if (!pasori) {
                console.log("\n[ERROR] PaSoRi init error.");
                pasori.close();
                process.exit();
            }

            var felica;
            try {
                pasori.reset();
                pasori.set_timeout(pasori_timeout);
                if (DEBUG) {
                    console.log("ON POLLING....");
                }
                
                process.send({
                        command:"on_polling",
                        pasori_index: pasori_index
                });

                felica = pasori.polling(FELICA.SYSTEM_CODE.FELICA_LITE,
                    FELICA.POLLING_TIMESLOT);

                if (DEBUG) {
                    console.log("  READ....");
                }
                var data = felica.read_single( CARDREADER.SERVICE_CODE,
                    0,
                    CARDREADER.ID_INFO.BLOCK_NUM);
                if (DEBUG) {
                    console.log("    DONE.... "+ data);
                }
                if (data != undefined) {
                    /*var pmm = felica.get_pmm().toHexString();*/
                    var id_code = data.substring( CARDREADER.ID_INFO.BEGIN_AT,
                         CARDREADER.ID_INFO.END_AT);
                    while (id_code.lastIndexOf("_") === id_code.length - 1) {
                            id_code = id_code.substring(0, id_code.length - 1);
                    }
                    if (DEBUG) {
                        console.log("  ID_CODE " + id_code);
                    }
                    process.send({
                        command: "on_read",
                        pasori_index: pasori_index,
                        id_code: id_code
                    });
                }
            } catch (e) {                
                process.send({
                    command: "on_idle",
                    pasori_index: pasori_index
                });
            } finally {
                if (felica) {
                    felica.close();
                    felica = undefined;
                }
                if(pasori.get_error_code() === 103){
                    console.log("\n[ERROR] PaSoRi device error.");
                    pasori.close();
                    process.exit();
                }
                if (DEBUG) {
                    console.log('.');
                }
            }
        }

    }, interval);
};

new PaSoRi().startReaders();