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

/* global require*/
/* jslint node: true */
"use strict";

exports.FILENAMES = {
    TEACHERS_FILENAME: '0_2013春教員アカウント情報.xlsx',
    STUDENTS_FILENAME: '1_2013春在籍者一覧.xlsx',
    LECTURES_FILENAME: '2_2013秋時間割情報.xlsx',
    MEMBERS_FILENAME: '3_2013秋暫定履修者.csv',
    MEMBER_FILENAME: '2013Autumn/34737.txt'
};

exports.DUMMY_ID_CODE = '000727';

exports.READ_STATUS_FIELD_KEYS = ['yyyymmdd', 'wdayatime', 'hhmmss', 'id_code', 'fullname', 'furigana', 'group_id'];


/* アプリケーション固有の設定 */
exports.APP = {
    HAVE_PASORI: true,
    AUTO_LAUNCH_BROWSER: true,
    CATCH_SIGINT: false,

    ETC_DIRECTORY: 'etc', //学生名簿ファイルの読み出し元ディレクトリ
    READ_STATUS_FILE_EXTENTION: 'csv.txt',
    READ_ERRROR_FILE_EXTENTION: 'error.csv.txt',
    VAR_DIRECTORY: 'var', //学生名簿ファイルの読み取り結果ファイルの保存先ディレクトリ
    FIELD_SEPARATOR: ',',
    ENCODING: 'UTF-8'
};

/* ネットワークの設定 */
exports.NET = {
    HTTP_PORT: 8888,
    WS_PORT: 8889
};

/* システム環境の設定 */
exports.ENV = {
    ENCODING: 'utf-8',
    PATH_SEPARATOR: '/'
};

/* PaSoRiの設定 */
exports.PASORI = {
    TIMEOUT: 150
};

/* FeliCaの設定 */
exports.FELICA = {
    POLLING_TIMESLOT: 0,
    SYSTEM_CODE: {
        ANY: 0xFFFF,
        FELICA_LITE: 0x88B4
    },
    READ_DELAY: 3000
};

/* 学生証リーダーの設定 */
exports.CARDREADER = {
    SERVICE_CODE: 0x000B,
    CHECK_ORDER_TEACHER_STUDENT: false,
    ID_INFO: {
        BLOCK_NUM: 0x8004,
        PREFIX: '01',
        BEGIN_AT: 2,
        END_AT: 9
    }
};

//2013春学期
//CONFIG.LECTURE_ID = '31001';//情報基礎
//CONFIG.LECTURE_ID = '34002';//概論IV
//CONFIG.LECTURE_ID = '34232';//ゼミ
//2013秋学期
exports.LECTURE_ID = '34502'; //概論IV
exports.GROUPING = true;
exports.NUM_GROUPS = 6;

require("../studentIDReader.js").main(exports);