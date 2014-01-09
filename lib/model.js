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

/**
   1人の教員の属性を表現するクラス
   @param [String] id_code ID
   @param [String] fullname 氏名
   @param [String] logname ICCアカウント名
*/
exports.Teacher = function(id_code, fullname, logname){
    this.id_code = id_code;
    this.fullname = fullname;
    this.logname = logname;
};

/**
   1人の学生の属性を表現するクラス
   @param [String] id_code 学籍番号
   @param [String] fullname 氏名
   @param [String] furigana フリガナ
   @param [String] gender 性別(不明な場合はnullを指定)
*/
exports.Student = function(id_code, fullname, furigana, gender){
    this.id_code = id_code;
    this.fullname = fullname;
    this.furigana = furigana;
    this.gender = gender;
};

exports.Student.prototype.to_s = function(){
    return "Student(id_code:"+this.id_code+", fullname:"+this.fullname+", "+this.furigana+")";
};

/**
   1つの開講科目・授業を表現するクラス
   @param [String] lecture_id 授業ID
   @param [String] grading_name 学年
   @param [String] name 授業名
   @param [String] teacher_id_code 担当教員ID
   @param [String] teacher_name 担当教員名
   @param [String] ayear 年度
   @param [String] semester 学期
   @param [String] wday 曜日
   @param [String] time 時限
*/
exports.Lecture = function(lecture_id,
                           grading_name, name,
                           teacher_id_code, teacher_name,
                           ayear, semester,
                           wday, time){
    this.lecture_id = lecture_id;
    this.grading_name = grading_name;
    this.name = name;
    this.teacher_id_code = teacher_id_code;
    this.teacher_name = teacher_name;
    this.ayear = ayear;
    this.semester = semester;
    this.wday = wday;
    this.time = time;
};

/**
   読み取り状況を表すクラス
   @param [String] lecture_id 授業ID(時間割コード)
   @param [String] id_code IDコード(学籍番号または教職員ID)
   @param [Date] time 読み取り時刻
*/
exports.ReadStatus = function(lecture_id, id_code, time){
    this.lecture_id = lecture_id;
    this.id_code = id_code;
    this.time = time;
};

exports.ReadStatus.prototype.getKey = function(){
    return this.id_code;
};


