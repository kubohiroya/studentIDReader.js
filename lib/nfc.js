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
/* global exports */
"use strict";

var stringUtil = require('../lib/util/stringUtil.js');
var CSVDB = require('./csvdb.js').CSVDB;

var events = require('events');
var NFC = require('../node_modules/nfc/build/Release/nfc').NFC;

// extend prototype
function inherits(target, source) {
    for (var k in source.prototype) {
        target.prototype[k] = source.prototype[k];
    }
}

inherits(NFC, events.EventEmitter);

var FIELD_KEYS = ['uid','userID'];
var FIELD_SEPARATOR = ',';
var ENCODING = 'utf-8';

var timeout;

var NFCReader = function(){
   
    var filename = 'lixin/lixin2014-2-uid.csv';
    console.log('read db:', filename);
    this.uidDB = new CSVDB(filename, FIELD_KEYS, FIELD_SEPARATOR, ENCODING, 
                           function(fileEntry){
                               return fileEntry;
                           },
                           function(entry){
                               return entry.uid;
                           });
    console.log('read db done:'+this.uidDB.keys().length);
    this.data = undefined;
    console.log("start nfc reader");
    this.nfc = new NFC();
    this.nfc.on('uid', function(uid){
            var uidstr = '';
            for(var i = 0; i < uid.length; i++){
                uidstr += uid[i];
            }
            console.log("UID:"+uid, uidstr);
            this.data = this.uidDB.get(uidstr).userID;
            timeout = new Date().getTime() + 1000;
        });
};

NFCReader.prototype.open_pasori_multi = function(){
    this.pasoriArray = [this.nfc];
    return this.pasoriArray;
};
NFCReader.prototype.open_pasori_single = function(){
    return this.nfc;
};


NFCReader.prototype.init = function(){};
NFCReader.prototype.reset = function(){};
NFCReader.prototype.set_timeout = function(msec){};
NFCReader.prototype.close = function(){};
NFCReader.prototype.polling = function(system_code, polling_timeslot){
};

NFCReader.prototype.get_error_code = function(){
    return 0;
};


var Felica = function(){
};

Felica.prototype.read_single = function(service_code, p, block_num){
    var now = new Date().getTime();
    if(now < timeout){
        return this.data;
    }
    return undefined;
};

Felica.prototype.close = function(){};

exports.device =  new NFCReader();
