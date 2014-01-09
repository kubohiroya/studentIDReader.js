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

var path = require('path');

require('./util/stringUtil.js');

var CSVDB = require('./csvdb.js').CSVDB;

var READ_STATUS_FILE_EXTENTION = 'csv.txt';
var READ_ERRROR_FILE_EXTENTION = 'error.csv.txt';

var FIELD_KEYS = ['yyyymmdd', 'wdayatime', 'hhmmss', 'lecture_id', 'id_code', 'fullname', 'furigana', 'group_id'];
var FIELD_SEPARATOR = ',';
var ENCODING = 'utf-8';

/**
  学生証の読み取り結果を保存するデータベース
*/
var AttendeeDB = function (attendee_dir, readStatusFactory, attendFileEntryFactory) {
    this.attendee_dir = attendee_dir;
    this.readStatusFactory = readStatusFactory;
    this.attendFileEntryFactory = attendFileEntryFactory;
    this.lasttime_db = {};
};

AttendeeDB.prototype.open = function (filename, filename_error) {
    if (! filename) {
        filename = this.create_filename(READ_STATUS_FILE_EXTENTION);
    }
    if (!filename_error) {
        filename_error = this.create_filename(READ_ERRROR_FILE_EXTENTION);
    }
    this.attendee_db = new CSVDB(filename, FIELD_KEYS, FIELD_SEPARATOR, ENCODING, this.readStatusFactory);
    this.error_db = new CSVDB(filename_error, FIELD_KEYS, FIELD_SEPARATOR, ENCODING, this.readStatusFactory);
};

/*
  学生証の読み取り結果を保存してある/これから保存するための、ファイル名を返す。
  @param [String] extension ファイル名の拡張子として指定したい文字列
  @return [String] ファイル名として使われる、現時刻の「年-月-日-曜日-時限」の文字列に、拡張子を加えた文字列を返す。
*/
AttendeeDB.prototype.create_filename = function (extension) {
    var now = new Date();
    return path.join(this.attendee_dir, now.get_yyyy_mm_dd_w_y() + '.' + extension);
};

/**
   IDコードを与えると、その学生の読み取り状況を表すオブジェクトを返す
   @param [String] id_code IDコード
   @return [ReadStatus] 読み取り済みの場合には、読み取り状況を表すオブジェクト。まだ読み取っていない場合にはundefined。
*/
AttendeeDB.prototype.get = function (id_code) {
    return this.readStatusFactory(this.attendee_db.get(id_code));
};

/**
   IDコードを与えると、その学生証の読み取りエラー状況を表すオブジェクトを返す
   @param [String] id_code IDコード
   @return [ReadStatus] 読み取り済みの場合には、読み取りエラー状況を表すオブジェクト。まだ読み取っていない場合にはundefined。
*/
AttendeeDB.prototype.get_error = function (id_code) {
    return this.readStatusFactory(this.error_db.get(id_code));
};

/**
   学生証の読み取り結果をデータベースに保存する
   @param [ReadStatus] read_status　読み取り状況を表すオブジェクト
   @param [Student] student 学生オブジェクト
   @param [String] group_id グループID
   @return 0;
*/
AttendeeDB.prototype.store = function (read_status, student, group_id) {
    var attendFileEntry = this.attendFileEntryFactory(read_status, student, group_id);
    this.attendee_db.store(attendFileEntry, true);
};

/**
   エラー読み取り結果を保存する
   @param [ReadStatus] read_status 読み取りエラー状況を表すオブジェクト
*/
AttendeeDB.prototype.store_error = function (read_status) {
    var attendFileEntry = this.attendFileEntryFactory(read_status, undefined, undefined);
    this.error_db.store(attendFileEntry, true);
};

AttendeeDB.prototype.store_lasttime = function (id_code, time) {
    this.lasttime_db[id_code] = time;
};

AttendeeDB.prototype.get_lasttime = function (id_code) {
    var lasttime = this.lasttime_db[id_code];
    if (lasttime){
        return lasttime;
    }else{
        return undefined;
    }
};

/**
  読み取り結果をすべて返す
   @return [Array] read_statusの配列
*/
AttendeeDB.prototype.values = function () {
    return this.attendee_db.values().map(this.readStatusFactory);
};

exports.AttendeeDB = AttendeeDB;
