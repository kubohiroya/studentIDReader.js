/*
  date unility library
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

var stringUtil = require("./stringUtil.js");

//大学の授業の開始時間 [[時,分],[時,分]...]
var ACADEMIC_TIME = [
    [0, 0],
    [9, 0],
    [10, 40],
    [13, 10],
    [14, 50],
    [16, 30],
    [18, 10]
];


//授業開始時間よりも何分前から出席を取るか？
var EARLY_MARGIN = 10;
//授業開始時間から何分後まで出席を取るか？
var LATE_MARGIN = 90;

var WDAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];


/**
   時刻を与えると、それが何時限目かを返す。
   @param [Integer] early_margin 授業開始時間よりも何分前から出席を取るか？
   @param [Integer] late_margin 授業開始時間から何分後まで出席を取るか？
   @return [Integer] 何時限目かを表す数値(1時限目なら1), 範囲外の時間なら0を返す。
*/

Date.prototype.getAcademicTime = function(early_margin, late_margin){
    var early_margin = (early_margin)? early_margin:EARLY_MARGIN;
    var late_margin = (late_margin)? late_margin:LATE_MARGIN;
    for(var i = 0; i < ACADEMIC_TIME.length; i++){
        var t = ACADEMIC_TIME[i];
        var now_time = this.getHours() * 60 + this.getMinutes();
        var start = t[0] * 60 + t[1];
        if(start - early_margin <= now_time &&
           now_time <= start + late_margin){
            return i;
        }
    }
    return 0;
};

Date.prototype.getWday = function(){
    return WDAY[this.getDay()];
};

Date.prototype.get_yyyymmdd_hhmmss  = function(){
    return this.get_yyyymmdd()+" "+this.get_hhmmss();
};

Date.prototype.get_yyyymmdd = function(){
    return this.getFullYear()+'-'+
    stringUtil.format0d(this.getMonth()+1)+'-'+
    stringUtil.format0d(this.getDate());
};

Date.prototype.get_wdayatime = function(){
    return this.getWday()+'-'+this.getAcademicTime();
};

Date.prototype.get_hhmmss = function(){
    return stringUtil.format0d(this.getHours())+':'+
    stringUtil.format0d(this.getMinutes())+':'+
    stringUtil.format0d(this.getSeconds());
};

