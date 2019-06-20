/*
1;95;0c  FeliCa Student ID card reader to check attendee
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

require('./util/dateUtil.js');

/* PaSoRi/FeliCaの設定 */
var FELICA = {
    TIMEOUT: 255,
    POLLING_TIMESLOT: 0,
    SYSTEM_CODE: {
        ANY: 0xFFFF,
        NDEF: 0x12fc,
        FELICA_LITE: 0x88B4,
        FELICA: 0xFE00
    }
};

/* 学生証リーダーの設定 */
var CUC_IDCARD = {
    SERVICE_CODE: 0x1A8B,
    ID_INFO: {
        BLOCK_NUM: 0x00,
        PREFIX: '01',
        BEGIN_AT: 2,
        END_AT: 9
    }
};

var read_cuc_card = function(felica, callback){
    var src = felica.readSingle(CUC_IDCARD.SERVICE_CODE,
				 0,
				 CUC_IDCARD.ID_INFO.BLOCK_NUM);
    if (src !== undefined) {
	var data = src.map(function(c){return String.fromCharCode(c);}).join('');
	var userID = data.substring( CUC_IDCARD.ID_INFO.BEGIN_AT,
				     CUC_IDCARD.ID_INFO.END_AT);
	if (userID.charAt(0) === '0') {
	    userID = userID.substring(0, userID.length - 1);
	    console.log("teacherCode: "+userID);
	}else{
	    console.log("studentCode: "+userID);
	}
	callback(userID);
    }
}

var Reader = function(){};
var readerDevice;

var pollingCount = 0;

Reader.prototype.startReaders = function (deviceType) {
    var deviceModule;
    console.log('[INFO] initialize deviceType = '+deviceType);
    if(deviceType === 'pafe') {
        deviceModule = require('node-libpafe');
    }else if(deviceType == 'dummy') {
        deviceModule = require('./dummy.js').device;
    }else{
        console.log('[FATAL] unknown deviceType:'+deviceType);
        process.exit(-1);
    }
    try{
        readerDevice = new deviceModule.Pasori();
	readerDevice.setTimeout(100);
    }catch(err){
        console.log("[FATAL] reader init error: "+JSON.stringify(err));
        process.exit();
    }
    polling(readerDevice);
};

/**
   この関数内で、FeliCaのポーリング、IDコードの読み出し、処理を行う。
   この関数内で読み取りループが行われるので、呼び出しはブロックする。
*/


var polling = function (readerDevice) {
    try{
	setInterval(function(){
            process.send({
		command:"onPolling",
		readerIndex: 1
            });
	    readerDevice.polling(FELICA.SYSTEM_CODE.FELICA,
				 FELICA.POLLING_TIMESLOT,
				 function(felica){
				     if(felica){
					 console.log('idm:',felica.getIDm());
					 try{
					     read_cuc_card(felica, function(userID){
						 process.send({
						     command: "onRead",
						     readerIndex: 1,
						     userID: userID
						 });
					     });
					 }catch(ignore){
					     console.log(ignore);
					 }finally{
					     try{
						 felica.close();
					     }catch(ignore){}
					 }
				     }
				     
				     process.send({
					 command: "onIdle",
					 readerIndex: 1
				     });
				 });
	}, 300);
    }catch(e){	
        console.log("[ERROR] "+e);
	process.exit();
    }
};


var _polling = function () {

    var interval = 10;
    var p = this;

    var DEBUG = false;
    if (!readerArray) {
        console.log("[ERROR] readerArray == NULL.");
        process.exit();
    }

    if (DEBUG) {
        console.log(new Date().get_hhmmss()+': init device loop');
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
            //reader.set_timeout(FELICA.TIMEOUT);
            if (DEBUG) {
                console.log(new Date().get_hhmmss()+'['+readerIndex+'] on polling.');
            }

            process.send({
                    command:"onPolling",
                        readerIndex: readerIndex
                        });

            reader.polling(FELICA.SYSTEM_CODE.FELICA,
                           FELICA.POLLING_TIMESLOT,
			   function(felica){
			       if (DEBUG) {
				   console.log(new Date().get_hhmmss()+'['+readerIndex+'] read....');
			       }
			       var _data = felica.read_single( CARDREADER.SERVICE_CODE,
							      0,
							       CARDREADER.ID_INFO.BLOCK_NUM);
			       if (DEBUG) {
				   console.log(new Date().get_hhmmss()+'['+readerIndex+'] read done');
			       }
			       if (data !== undefined) {
				   /*var pmm = felica.get_pmm().toHexString();*/
				   var data = '';
				   for(var i = 0; i < _data.length; i++){
				       data += String.fromCharCode(_data[i]);
				   }
				   var userID = data.substring( CARDREADER.ID_INFO.BEGIN_AT,
								CARDREADER.ID_INFO.END_AT);
				   while (userID.lastIndexOf("_") === userID.length - 1) {
				       userID = userID.substring(0, userID.length - 1);
				   }

				   console.log("  ID_CODE " + userID);

				   process.send({
				       command: "onRead",
				       readerIndex: readerIndex,
				       userID: userID
				   });
			       }
					
			   });

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
                console.log(new Date().get_hhmmss()+'['+readerIndex+'] finalize.');
            }
            pollingCount++;
        }
    }
    if (DEBUG) {
        console.log(new Date().get_hhmmss()+'  finalize.');
    }

    //console.log("pc="+pollingCount);
    //setImmediate(polling);

    //setTimeout(polling, interval);

};

process.on('message', function (json) {
        var message = JSON.parse(json);
        if(message.command === 'start' && message.deviceType){
            new Reader().startReaders(message.deviceType);
        }else{
            console.log('[ERROR] unknown message: ' + json);
        }
    });
