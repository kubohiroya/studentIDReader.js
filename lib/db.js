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

var Iconv = require('iconv').Iconv;
var fs = require('fs');

require('./util/stringUtil.js');

var ObjectUtil = require('./util/objectUtil.js').ObjectUtil;
var cuc = require('./cuc.js');
var model = require('../lib/model.js');
var forEachLineSync = require('../lib/forEachLine.js').forEachLineSync;

var DEBUG = false;
var utf8toutf16 = new Iconv("UTF-8", "UTF-16");
var FIELD_KEYS = ['yyyymmdd', 'wdayatime', 'hhmmss', 'lecture_id', 'id_code', 'fullname', 'furigana', 'group_id'];

/**
   IDカードの読み取り結果を、ファイルとメモリ上のハッシュテーブルの両方に対して、
   同期した形で保存していくような動作をするデータベースを表すクラス
*/
var ReadStatusDB = function (separator, readStatusFactory) {
    this.separator = separator;
    this.readStatusFactory = readStatusFactory;

    this.attendee_db = {};
    this.error_db = {};
};

ReadStatusDB.prototype.open = function (filename){

    this.filename = filename;
    var attendee_db = this.attendee_db;
    var readStatusFactory = this.readStatusFactory;

    if (fs.existsSync(this.filename)) {
        forEachLineSync(this.filename, {
                encoding: 'UTF-8',
                separator: this.separator
            },
            FIELD_KEYS,
            function (entry) {
                var yyyymmddhhmmss = (entry.yyyymmdd + " " + entry.hhmmss);
                var datetime = yyyymmddhhmmss.split(/[\s\-\:\,]/).createDateAs(['year', 'mon', 'day', 'hour', 'min', 'sec']);

                try{
                    attendee_db[entry.id_code] = readStatusFactory(entry.id_code,
                                                                   datetime, datetime, entry);
                }catch(err){
                    console.log("Exception in ReadStatusDB.open: "+filename+" : " + err + "\n stack: "+err.stack);
                }
            });
    }
};

ReadStatusDB.prototype.open_error = function (filename_error) {

    this.filename_error = filename_error;
    var attendee_db = this.attendee_db;
    var readStatusFactory = this.readStatusFactory;
    var db = this;
    if (fs.existsSync(this.filename_error)) {
        forEachLineSync(this.filename_error, {
                encoding: 'UTF-8',
                separator: this.separator
            },
            FIELD_KEYS,
            function (entry) {
                var yyyymmddhhmmss = (entry.yyyymmdd + " " + entry.hhmmss);
                var datetime = yyyymmddhhmmss.split(/[\s\-\:\,]/).createDateAs(['year', 'mon', 'day', 'hour', 'min', 'sec']);
                if (entry.lecture_id !== '') {
                    try{
                        db.error_db[entry.id_code] = readStatusFactory(entry.lecture_id, entry.id_code, datetime, datetime, entry);
                    }catch(err){
                        console.log("ReadStatusDB.open_error: "+err);
                    }
                };
            });
    }
};

ReadStatusDB.prototype.list = function () {
    var list = [];
    for(var key in this.attendee_db){
        var value = this.attendee_db[key];
        list.push(value);
    }
    return list;
};


/**
   メモリ上のデータベースを初期化する
*/
ReadStatusDB.prototype.clear_memory = function () {
    this.attendee_db = {};
    this.error_db = {};
};

ReadStatusDB.prototype.get_filename = function () {
    return this.filename;
};

ReadStatusDB.prototype.get_filename_error = function () {
    return this.filename_error;
};


/**
   その学生証が、現在の時限において読み取り済みかどうかを返す
   @param [String] id_code IDコード
   @return [Boolean] その学生証が、現在の時限において読み取り済みかどうか
*/
ReadStatusDB.prototype.exists = function (id_code) {
    return this.attendee_db[id_code] !== null;
};

/**
   IDコードを与えると、その学生の読み取り状況を表すオブジェクトを返す
   @param [String] id_code IDコード
   @return [ReadStatus] 読み取り済みに場合には、読み取り状況を表すオブジェクト。まだ読み取っていない場合にはnull。
*/
ReadStatusDB.prototype.get = function (id_code) {
    return this.attendee_db[id_code];
};

/**
   IDコードを与えると、その学生の読み取り状況を表すオブジェクトを返す
   @param [String] id_code IDコード
   @return [ReadStatus] 読み取り済みに場合には、読み取り状況を表すオブジェクト。まだ読み取っていない場合にはnull。
*/
ReadStatusDB.prototype.get_error = function (id) {
    return this.error_db[id];
};

/**
   学生証の読み取り結果をデータベースに保存する
   @param [ReadStatus] read_status　読み取り状況を表すオブジェクト
   @param [Student] student 学生オブジェクト
*/
ReadStatusDB.prototype.store = function (read_status, student) {
    //必要に応じて保存先ファイルを切り替える
    var filename = this.get_filename();
    if (this.filename != filename) {
        // 元のファイルはクローズし、新しく現時刻の時限のファイルを開く
        console.log('open:' + filename);
        this.filename = filename;
        this.clear_memory();
    }
    // このIDコードの学生の読み取り状況をメモリ上のデータベースに登録する

    var isNewEntry = false;

    if (!this.attendee_db[read_status.id_code]) {
        isNewEntry = true;
    }

    this.attendee_db[read_status.id_code] = read_status;

    if (!isNewEntry) {
        return;
    }

    student.yyyymmdd = read_status.lasttime.get_yyyymmdd();
    student.wdayatime = read_status.lasttime.get_wdayatime();
    student.hhmmss = read_status.lasttime.get_hhmmss();
    student.lecture_id = read_status.lecture_id;

    console.log("store:" + student.id_code +' in '+ read_status.lecture_id);

    console.log("student:" + JSON.stringify(student));

    // このIDコードの学生の読み取り状況をファイル上の1行として保存する
    var line = ObjectUtil.values(student, FIELD_KEYS).join(this.separator) + "\n";
    fs.appendFileSync(this.filename, line);
    //fs.appendFileSync(this.filename, utf8toutf16.convert(line));

};

/**
   名簿にない学生の学生証の読み取り結果を保存する
   @param [ReadStatus] read_status 読み取り状況オブジェクト
*/
ReadStatusDB.prototype.store_error = function (read_status) {

    if (this.error_db[read_status.id_code]) {
        // すでに保存済みの「名簿にないIDカード」ならば-1を返して終了
        return -1;
    }

    //必要に応じて保存先ファイルを切り替える
    var filename_error = this.get_filename_error();

    if (this.filename_error != filename_error) {
        console.log('open:' + filename_error);
        this.filename_error = filename_error;
        this.clear_memory();
    }

    // このIDカードの読み取り状況をメモリ上のデータベースに登録する
    this.error_db[read_status.id_code] = read_status;
    // このIDカードの読み取り状況をファイル上の1行として保存する

    //var keys = ['yyyymmdd', 'wdayatime', 'hhmmss', 'id_code'];
    var entry = {
        yyyymmdd: read_status.lasttime.get_yyyymmdd(),
        wdayatime: read_status.lasttime.get_wdayatime(),
        hhmmss: read_status.lasttime.get_hhmmss(),
        lecture_id: read_status.lecture_id,
        id_code: read_status.id_code
    };

    var line = ObjectUtil.values(entry, FIELD_KEYS).join(this.sepator) + "\n";
    //fs.appendFileSync(this.filename_error, utf8toutf16.convert(line));
    fs.appendFileSync(this.filename_error, line);
};


//年度,学期,学期区分,曜日時限,時間割コード,科目名,担当教員,学科,年次,学籍番号,学生氏名（略称）,学生氏名（英字）,備考
//2013,秋学期,秋学期,水3,34502,"政策情報学概論IV","久保 裕也",P,3,1140000,"●　内　▼　平","MARUCHI SANKAKUEI",""
function create_member(entry) {
    for (var key in entry) {
        var value = entry[key];
        if (value.substr(0, 1) == '"' && value.substr(value.length - 1, 1) == '"') {
            entry[key] = value.substr(1, value.length - 2);
        }
    }
    return entry;
}

function add_default_value(entry, default_entry) {
    for (var key in default_entry) {
        if (entry[key] === undefined || entry[key] === '') {
            entry[key] = default_entry[key];
        }
    }
    return entry;
}

exports.loadEnrollmentFile = function (filename, param) {
    var enroll_map = {};
    var index = 0;
    var num_members = 0;
    var default_member;

    forEachLineSync(filename, param, ['ayear', 'semester', 'semester_division', 'wdaytime', 'id_code', 'title', 'teachername', 'department_code', 'grade', 'studentid', 'fullname', 'fullname_en', 'memo'],
        function (entry) {

            index++;

            if (index == 1 || entry.ayear == '履修者数') {
                return;
            }


            var member = create_member(entry);

            if (index == 2) {
                default_member = member;
            } else {
                member = add_default_value(member, default_member);
            }

            member.logname = cuc.id2logname(member.studentid);
            member.wday = entry.wdaytime.substring(0, 1);
            member.time = entry.wdaytime.substring(2, 1);

            enroll_map[member.studentid] = member;

            if (DEBUG) {
                console.log('load member: ' +
                    member.studentid + ' ' +
                    member.fullname + ' ' + member.logname);
            }
            num_members += 1;
        });
    if (DEBUG) {
        console.log('finish: loading member file: ' + num_members + ' members.');
    }

    var student_db = {};

    var lecture;

    for (var student_id in enroll_map) {
        var entry = enroll_map[student_id];
        if (lecture === undefined) {
            var grading_name = 'N/A';
            var teacher_id_code = 'N/A';
            var wday = entry.wdaytime.substring(0, 1);
            var time = entry.wdaytime.substring(2, 1);
            lecture = new model.Lecture(entry.id_code, grading_name, entry.title, teacher_id_code, entry.teachername, entry.ayear, wday, time);
        }
        student_db[entry.studentid] = new model.Student(entry.studentid, entry.fullname, entry.fullname_en, undefined);
    }

    return {
        'lecture': lecture,
        'student_db': student_db
    };

};


/**
   教員名簿のファイルを読み、教員のハッシュテーブルを返す
   @param [String] filename 教員名簿ファイルのファイル名
   @return [Hash] id_code:教員 という構造のハッシュテーブル
*/
exports.loadTeacherFile = function (filename, param, teacherFactory) {
    var teacher_db = {};
    var num_teachers = 0;
    forEachLineSync(filename, param, ['id_code', 'fullname', 'logname'],
        function (entry) {
            teacher_db[entry.id_code] = teacherFactory(entry);
            if (DEBUG) {
                console.log("load teacher: " +
                    entry.id_code + " " +
                    entry.fullname + " " + entry.logname);
            }
            num_teachers += 1;
        });
    console.log("finish: loading teacher file: " + num_teachers + " teachers.");
    return teacher_db;
};

exports.ReadStatusDB = ReadStatusDB;
