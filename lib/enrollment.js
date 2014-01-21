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

function createMember(entry) {
    for (var key in entry) {
        var value = entry[key];
        if (value.substr(0, 1) == '"' && value.substr(value.length - 1, 1) == '"') {
            entry[key] = value.substr(1, value.length - 2);
        }
    }
    return entry;
}

function addDefaultValue(entry, defaultEntry) {
    for (var key in defaultEntry) {
        if (entry[key] === undefined || entry[key] === '') {
            entry[key] = defaultEntry[key];
        }
    }
    return entry;
}

exports.loadEnrollmentFile = function (filename, param) {
    var enrollMap = {};
    var index = 0;
    var numMembers = 0;
    var defaultMember;

    forEachLineSync(filename, param, ['ayear', 'semester', 'semesterDivision', 'wdaytime', 'lectureID', 'title', 'teachername', 'departmentCode', 'grade', 'userID', 'fullname', 'fullname_en', 'memo'],
        function (entry) {

            index++;

            if (index == 1 || entry.ayear == '履修者数') {
                return;
            }


            var member = createMember(entry);

            if (index == 2) {
                defaultMember = member;
            } else {
                member = addDefaultValue(member, defaultMember);
            }

            member.logname = cuc.id2logname(member.userID);
            member.wday = entry.wdaytime.substring(0, 1);
            member.time = entry.wdaytime.substring(2, 1);

            enrollMap[member.userID] = member;

            if (DEBUG) {
                console.log('load member: ' +
                    member.userID + ' ' +
                    member.fullname + ' ' + member.logname);
            }
            numMembers += 1;
        });
    if (DEBUG) {
        console.log('finish: loading member file: ' + numMembers + ' members.');
    }

    var enrollmentDB = {};

    var lecture;

    for (var userID in enrollMap) {
        var entry = enrollMap[userID];
        if (lecture === undefined) {
            var gradingName = 'N/A';
            var teacherID = 'N/A';
            var wday = entry.wdaytime.substring(0, 1);
            var time = entry.wdaytime.substring(2, 1);
            lecture = new model.Lecture(entry.lectureID, gradingName, entry.title, teacherID, entry.teachername, entry.ayear, entry.semester, wday, time);
        }
        enrollmentDB[entry.userID] = new model.Student(entry.userID, entry.fullname, entry.fullname_en, undefined);
    }

    return {
        'lecture': lecture,
        'enrollmentDB': enrollmentDB
    };

};


/**
   教員名簿のファイルを読み、教員のハッシュテーブルを返す
   @param [String] filename 教員名簿ファイルのファイル名
   @param [Hash] param 読み取り属性
   @param [Function] teacherFactory 教員オブジェクトのファクトリ関数
   @return [Hash] 教員のハッシュテーブル
*/
exports.loadTeacherFile = function (filename, param, teacherFactory) {
    var teacherDB = {};
    var numTeachers = 0;
    forEachLineSync(filename, param, ['userID', 'fullname', 'logname'],
        function (entry) {
            teacherDB[entry.userID] = teacherFactory(entry);
            if (DEBUG) {
                console.log("load teacher: " +
                    entry.userID + " " +
                    entry.fullname + " " + entry.logname);
            }
            numTeachers += 1;
        });
    console.log("finish: loading teacher file: " + numTeachers + " teachers.");
    return teacherDB;
};

