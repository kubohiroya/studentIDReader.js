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

var CSVDB = require('./csvdb.js').CSVDB;

var READ_STATUS_FILE_EXTENTION = 'csv.txt';
var READ_ERRROR_FILE_EXTENTION = 'error.csv.txt';

var FIELD_KEYS = ['yyyymmdd', 'wdayatime', 'hhmmss', 'lectureID', 'userID', 'fullname', 'furigana', 'groupID'];
var FIELD_SEPARATOR = ',';
var ENCODING = 'utf-8';

/**
  学生証の読み取り結果を保存するデータベース
*/
var AttendeeDB = function (attendeeDir, attendeeFilenameBase, readStatusFactory, attendFileEntryFactory) {
    this.readStatusFactory = readStatusFactory;
    this.attendFileEntryFactory = attendFileEntryFactory;
    this.lasttimeDB = {};

    var filename = this.createFilename(attendeeDir, attendeeFilenameBase, READ_STATUS_FILE_EXTENTION);
    var filenameError = this.createFilename(attendeeDir, attendeeFilenameBase, READ_ERRROR_FILE_EXTENTION);

    var getKeyFunc = function(entry){
            return entry.userID;
    };

    this.attendeeDB = new CSVDB(filename, FIELD_KEYS, FIELD_SEPARATOR, ENCODING, this.readStatusFactory, getKeyFunc);
    this.errorDB = new CSVDB(filenameError, FIELD_KEYS, FIELD_SEPARATOR, ENCODING, this.readStatusFactory, getKeyFunc);
};

/*
  学生証の読み取り結果を保存してある/これから保存するための、ファイル名を返す。
  @param [String] extension ファイル名の拡張子として指定したい文字列
  @return [String] ファイル名として使われる、現時刻の「年-月-日-曜日-時限」の文字列に、拡張子を加えた文字列を返す。
*/
AttendeeDB.prototype.createFilename = function (attendeeDir, filenameBase, extension) {
    return path.join(attendeeDir, filenameBase + '.' + extension);
};

/**
   IDコードを与えると、そのユーザの読み取り状況を表すオブジェクトを返す
   @param [String] userID IDコード
   @return [ReadStatus] 読み取り済みの場合には、読み取り状況を表すオブジェクト。まだ読み取っていない場合にはundefined。
*/
AttendeeDB.prototype.get = function (userID) {
    return this.readStatusFactory(this.attendeeDB.get(userID));
};

/**
   IDコードを与えると、その学生証の読み取りエラー状況を表すオブジェクトを返す
   @param [String] userID IDコード
   @return [ReadStatus] 読み取り済みの場合には、読み取りエラー状況を表すオブジェクト。まだ読み取っていない場合にはundefined。
*/
AttendeeDB.prototype.getError = function (userID) {
    return this.readStatusFactory(this.errorDB.get(userID));
};

/**
   学生証の読み取り結果をデータベースに保存する
   @param [ReadStatus] readStatus　読み取り状況を表すオブジェクト
   @param [Student] student 学生オブジェクト
   @param [String] groupID グループID
   @return 0;
*/
AttendeeDB.prototype.store = function (readStatus, student, groupID) {
    var attendFileEntry = this.attendFileEntryFactory(readStatus, student, groupID);
    this.attendeeDB.store(attendFileEntry, true);
};

/**
   エラー読み取り結果を保存する
   @param [ReadStatus] readStatus 読み取りエラー状況を表すオブジェクト
*/
AttendeeDB.prototype.storeError = function (readStatus) {
    var attendFileEntry = this.attendFileEntryFactory(readStatus, undefined, undefined);
    this.errorDB.store(attendFileEntry, true);
};

AttendeeDB.prototype.storeLasttime = function (userID, time) {
    this.lasttimeDB[userID] = time;
};

AttendeeDB.prototype.getLasttime = function (userID) {
    var lasttime = this.lasttimeDB[userID];
    if (lasttime) {
        return lasttime;
    } else {
        return undefined;
    }
};

/**
  読み取り結果をすべて返す
   @return [Array] readStatusの配列
*/
AttendeeDB.prototype.values = function () {
    return this.attendeeDB.values().map(this.readStatusFactory);
};

exports.AttendeeDB = AttendeeDB;