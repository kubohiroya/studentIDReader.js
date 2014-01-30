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

var PafeDummy = function(){
    this.pasori_1 = new PasoriDummy();
};
PafeDummy.prototype.open_pasori_multi = function(){
    this.pasoriArray = [this.pasori_1];
    return this.pasoriArray;
};
PafeDummy.prototype.open_pasori_single = function(){
    return this.pasori_1;
};


var PasoriDummy = function(){};
PasoriDummy.prototype.init = function(){};
PasoriDummy.prototype.reset = function(){};
PasoriDummy.prototype.set_timeout = function(msec){};
PasoriDummy.prototype.close = function(){};
PasoriDummy.prototype.polling = function(system_code, polling_timeslot){
    return new FelicaDummy();
};
PasoriDummy.prototype.get_error_code = function(){
    return 0;
};


var FelicaDummy = function(){
};
FelicaDummy.prototype.read_single = function(service_code, p, block_num){
    if(Math.floor(Math.random() *20 ) === 0){
        var num = Math.floor(Math.random() * 10) + 1;
        var data = "010000"+stringUtil.format0d(num)+"__";
        return data;
    }else{
        return undefined;
    }
};
FelicaDummy.prototype.close = function(){};

exports.pafe =  new PafeDummy();
