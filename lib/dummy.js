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


var FeliCaDummy = function(){
};
FeliCaDummy.prototype.readSingle = function(service_code, p, block_num){
    if(Math.floor(Math.random() *20 ) === 0){
        var num = Math.floor(Math.random() * 10) + 1;
        var data = "010000"+stringUtil.format0d(num)+"__";
        return data;
    }else{
        return undefined;
    }
};
FeliCaDummy.prototype.getIDm = function(){
    return undefined;
};
FeliCaDummy.prototype.getPMm = function(){
    return undefined;
};
FeliCaDummy.prototype.close = function(){};

var PafeDummy = function(){
    this.pasori = new PasoriDummy();
};

var PasoriDummy = function(){};
PasoriDummy.prototype.reset = function(){};
PasoriDummy.prototype.setTimeout = function(msec){};
PasoriDummy.prototype.polling = function(system_code, polling_timeslot, callback){
    return callback(new FeliCaDummy());
};


PafeDummy.prototype.Pasori = PasoriDummy;

exports.device =  new PafeDummy();
