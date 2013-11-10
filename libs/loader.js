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

var foreach = require('./forEachLine.js');

var DEBUG = true;

/**
   教員名簿のファイルを読み、教員のハッシュテーブルを返す
   @param [String] filename 教員名簿ファイルのファイル名
   @return [Hash] id_code:教員 という構造のハッシュテーブル
*/
function loadTeacherDB(filename, param, teacherFactory){
    var teacher_map = {};
    var num_teachers = 0;
    foreach.forEachLineSync(filename, param,
                    ['id_code','fullname','logname'],
                    function(entry){
                        teacher_map[entry.id_code] = teacherFactory(entry);
                        if(DEBUG){
                            console.log("load teacher: " + 
                                        entry.id_code + " "+ 
                                        entry.fullname+" "+entry.logname);
                        }
                        num_teachers += 1;
                    });
    console.log("finish: loading teacher file: "+num_teachers +" teachers.");
    return teacher_map;
}

/**
   学生名簿のファイルを読み、学生名簿のハッシュテーブルを返す
   @param [String] filename 学生名簿ファイルのファイル名
   @return [Hash] '学籍番号':学生 という構造のハッシュテーブル
*/
function loadStudentDB(filename, param, studentFactory){
    var student_map = {};
    var num_students = 0;
    foreach.forEachLineSync(filename, param,
                    ['id_code','fullname','furigana','gender'],
                    function(entry){
                        student_map[entry.id_code] = studentFactory(entry);
                        if(DEBUG){
                            console.log("load student: " + 
                                        entry.id_code + " "+ 
                                        entry.fullname + " "+ 
                                        entry.furigana);
                        }
                        num_students += 1;
                    });
    console.log("finish: reaading student file: "+num_students +" students.");
    return student_map;
}

/**
   開講科目一覧ファイルを読み、開講科目定義へのハッシュテーブルを返す
   @param [String] filename 開講科目一覧ファイルのファイル名
   @return [Object] Lectureのインスタンス('時間割コード':開講科目定義、'曜日,時限':開講科目リスト という構造のハッシュテーブルをメンバとするオブジェクト)
*/
function loadLectureDB(filename, param, lectureFactory){
    var lecture_id_map = {};
    var lecture_wdaytime_map = {};
    var id_code_map = {};
    var num_lectures = 0;
    foreach.forEachLineSync(filename, param, 
                    ['lecture_id','grading_name','name',
                     'id_code','teacher','co_teacher_id_code','co_teacher', 'wday', 'time'],

                    function(entry){
                        var lecture = lectureFactory(entry);

                        lecture_id_map[entry.lecture_id] = lecture;

                        var wday_time_key = entry.wday+','+entry.time;
                        lecture_wdaytime_map[wday_time_key] = lecture;

                        id_code_map[entry.id_code] = lecture;
                        if(entry.co_teacher_id_code){
                            id_code_map[entry.co_teacher_id_code] = lecture;
                        }

                        if(DEBUG){
                            console.log("load lecture: " + 
                                        entry.lecture_id + " "+ 
                                        entry.name);
                        }
                        num_lectures += 1;
                    });

    console.log("finish: loading lecture file: "+num_lectures +" lectures.");

    return {lecture_id_map:lecture_id_map, 
            wdaytime_map: lecture_wdaytime_map, 
            id_code_map: id_code_map};
}

/**
  授業履修者名簿のファイルを読み、履修者名簿のハッシュテーブルを返す
   @param [String] filename 履修者名簿ファイルのファイル名
   @param [String] param field_separator カラムの区切り文字などの指定
   @return [Hash] '授業時間割コード':履修者の学籍番号の配列という構造のハッシュテーブル
*/
function loadMemberDB(filename, param, field_separator){
    var member_map = {};
    var num_lectures = 0;
    var num_members = 0;
    param.encoding = 'SHIFT-JIS';

    foreach.forEachLineSync(filename, param,
                    ['lecture_id','lecture_name','teacher','id_code','student_name'],
                    function(entry){
                        if(! member_map[entry.lecture_id]){
                            member_map[entry.lecture_id] = {};
                            num_lectures++;
                        }
                        member_map[entry.lecture_id][entry.id_code] = true;
                        num_members++;
                        if(DEBUG){
                            console.log("load member: " + 
                                        entry.lecture_id+'->'+entry.id_code);
                        }
                    });
    console.log("finish: loading member file: "+num_members+" members of "+num_lectures+" lectures.");
    return member_map;
}

module.exports.load = function(etc_directory, path_separator, filenames, 
                    encoding,
                    field_separator,
                    teacherFactory, studentFactory, lectureFactory){

    var param = {encoding:'utf-8', separator:field_separator};

    return {
        teachers:
        loadTeacherDB(etc_directory+path_separator+filenames.TEACHERS_FILENAME, param, teacherFactory),
        students:
        loadStudentDB(etc_directory+path_separator+filenames.STUDENTS_FILENAME, param, studentFactory),
        lectures:
        loadLectureDB(etc_directory+path_separator+filenames.LECTURES_FILENAME, param, lectureFactory),
        members:
        loadMemberDB(etc_directory+path_separator+filenames.MEMBERS_FILENAME, param, field_separator)
    };
};

module.exports.load2 = function(etc_directory, path_separator, filenames, 
                    encoding,
                    field_separator,
                    teacherFactory){

    var param = {encoding:'utf-8', separator:field_separator};

    return loadTeacherDB(etc_directory+path_separator+filenames.TEACHERS_FILENAME, param, teacherFactory);
};

return module.exports;

