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

var cuc = require('./cuc.js');
var model = require('./model.js');
var forEachLineSync = require('./forEachLine.js').forEachLineSync;

var DEBUG = false;

/////////////////////////////////////

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

    var enrollment_db = {};

    var lecture;

    for (var student_id in enroll_map) {
        var entry = enroll_map[student_id];
        if (lecture === undefined) {
            var grading_name = 'N/A';
            var teacher_id_code = 'N/A';
            var wday = entry.wdaytime.substring(0, 1);
            var time = entry.wdaytime.substring(2, 1);
            lecture = new model.Lecture(entry.id_code, grading_name, entry.title, teacher_id_code, entry.teachername, entry.ayear, entry.semester, wday, time);
        }
        enrollment_db[entry.studentid] = new model.Student(entry.studentid, entry.fullname, entry.fullname_en, undefined);
    }

    return {
        'lecture': lecture,
        'enrollment_db': enrollment_db
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

