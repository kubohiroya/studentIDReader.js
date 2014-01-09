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

require('./util/stringUtil.js');

var fs = require('fs');

var ObjectUtil = require('./util/objectUtil.js').ObjectUtil;
var forEachLineSync = require('../lib/forEachLine.js').forEachLineSync;

//var Iconv = require('iconv').Iconv;
//var utf8toutf16 = new Iconv("UTF-8", "UTF-16");

var DEBUG = false;

/**
   CSVファイル形式で永続化されたハッシュテーブル（ファイルとメモリ上の両方に対して同期した形での利用が可能）
*/
var CSVDB = function (filename, field_keys, separator, encoding, newEntryFactory) {
    this.filename = filename;
    this.field_keys = field_keys;
    this.separator = separator;
    this.encoding = encoding;

    this.db = {};

    var db = this.db;

    if (fs.existsSync(this.filename)) {
        forEachLineSync(this.filename, {
                encoding: encoding,
                separator: this.separator
            },
            this.field_keys,
            function(entry){
                var key = newEntryFactory(entry).getKey();
                db[key] = entry;
            }
            );
    }
};

CSVDB.prototype.get_filename = function () {
    return this.filename;
};

/**
   そのエントリが存在するかどうかを返す
   @param [String] key
   @return [Boolean] そのエントリが存在するかどうか
*/
CSVDB.prototype.exists = function (key) {
    return this.db[key] != undefined;
};

/**
   keyを用いてそのエントリを返す
   @param [String] key
   @return [Object] そのエントリ
*/
CSVDB.prototype.get = function (key) {
    return this.db[key];
};

/**
   エントリをデータベースに保存する
   @param [Object] newEntry 保存するエントリ
   @param [boolean] omitFileOverwrite trueを指定した場合、同じキーが登録済みのときに、ファイル上のエントリを上書きしない
   @param [boolean] omitCacheOverwrite trueを指定した場合、同じキーが登録済みのときに、メモリ上のエントリを上書きしない
*/
CSVDB.prototype.store = function (newEntry, omitFileOverwrite, omitCacheOverwrite) {
    var key = newEntry.getKey();
    var oldEntry = this.db[key];

    if (! omitCacheOverwrite) {
        this.db[key] = newEntry;
    }

    if (omitFileOverwrite && oldEntry) {
        // do nothing
        if (DEBUG) {
            console.log('CSVDB('+ this.filename +')[' + key +'] = do nothing');
        }
    }else{
        if (DEBUG) {
            console.log('CSVDB('+ this.filename +')[' + key +'] = ' + JSON.stringify(newEntry));
        }
        // このエントリをファイル上の1行として保存する
        var line = ObjectUtil.values(newEntry, this.field_keys).join(this.separator) + '\n';
        fs.appendFileSync(this.filename, line);
    }
};

/**
   このデータベースの値すべてを配列として返す。
 */
CSVDB.prototype.values = function () {
    var list = [];
    for(var key in this.db){
        var value = this.db[key];
        list.push(value);
    }
    return list;
};

/**
   このデータベースのキーすべてを配列として返す。
 */
CSVDB.prototype.keys = function () {
    return Object.keys(this.db);
};

exports.CSVDB = CSVDB;
return CSVDB;