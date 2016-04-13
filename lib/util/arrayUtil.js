/*
  array unility library
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

/**
   16進数表記を返す
   @param [Array] ary 元データの配列
*/
Array.prototype.toHexString = function(){
    var ret = '';
    for(var i = 0; i<this.length; i++){
        ret += Math.floor(this[i] / 16).toString(16);
        ret += (this[i] % 16).toString(16);
    }
    return ret;
};

Array.prototype.toAsciiString = function(){
    var ret = '';
    for(var i = 0; i < this.length; i++){
        ret += String.fromCharCode(this[i]);
    }
    return ret;
};

Array.prototype.mapParsedIntValues = function(keys){
    var entry = {};
    for(var i = 0; i < keys.length; i++){
        var value = this[i];
        if(value){
            for(var j = 0; j < value.length; j++){
                if(value[j] != '0'){
                    value = value.substring(j);
                    break;
                }
            }
            entry[keys[i]] = parseInt(value);
        }else{
            entry[keys[i]] = 0;
        }
    }
    return entry;
};

Array.prototype.createDateAs = function (keys){
    var time = this.mapParsedIntValues(keys);
    return new Date(time.year, 
                    time.mon - 1, 
                    time.day, 
                    time.hour, 
                    time.min, 
                    time.sec)
};

Array.prototype.flatten = function(){
    var ret = [];
    for(var i = 0; i < this.length; i++){
        if(this[i] instanceof Array){
            ret.push(this[i].flatten());
        }else{
            ret.push(this[i]);
        }
    }
    return ret;
};

Array.prototype.shuffle = function() {
    var i = this.length;
    while(i){
        var j = Math.floor(Math.random()*i);
        var t = this[--i];
        this[i] = this[j];
        this[j] = t;
    }
    return this;
};
