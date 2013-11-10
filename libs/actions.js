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

var MESSAGE_ATTEND = "出席";
var MESSAGE_NO_USER = '学内関係者ではありません';
var MESSAGE_NO_MEMBER = '履修者ではありません';
var MESSAGE_CONTINUOUS_READ = '出席(継続読み取り)';
var MESSAGE_ALREADY_READ = '(処理済み)';
var MESSAGE_ADMIN_CONFIG = '教員(管理)';

var DEBUG = false;

/**
   FeliCa学生証読み取り時のアクション
*/
exports.Actions = function(){
};

exports.Actions.prototype.send = function(ws, data){

    if(! ws || ! ws.clients){
        return;
    }

    ws.clients.forEach(
        function(client) {
            client.send(JSON.stringify(data));
        }
    );
};

exports.Actions.prototype.onStartUp = function(ws, lecture, teachers, max_members){
    this.send(ws, {
            command:'onStartUp',
            classname:lecture.name,
            teacher: teachers,
            max:max_members
        });
};

/**
   教員カードを読み取った場合
*/
exports.Actions.prototype.on_adminConfig = function(ws, deviceIndex, read_status){

    if(DEBUG){
        console.log("ADMIN: "+read_status.lasttime.get_yyyymmdd_hhmmss());
    }

    var teacher = read_status.entry;

    this.send(ws, {
        command: 'onAdminCardReading',
        time:read_status.lasttime.getTime(),
        teacher_id:read_status.id,
        teacher:teacher,
        result:MESSAGE_ADMIN_CONFIG,
        deviceIndex: deviceIndex,
    });
};

/**
   学生名簿に学生データが存在し、かつ、
   学生証から学籍番号が読み取れた場合
*/
exports.Actions.prototype.on_attend = function(ws, deviceIndex, read_status){

    var student = read_status.entry;

    if(DEBUG){
        console.log( read_status.lasttime.get_yyyymmdd_hhmmss());
        console.log( MESSAGE_ATTEND+" "+student.id_code+" "+student.fullname);
    }

    this.send(ws, {
        command: 'onRead',
        time:read_status.lasttime.getTime(),
        id_code:read_status.id,
        student:student,
        result:MESSAGE_ATTEND,
        deviceIndex: deviceIndex,
        sound: true
    });
    
};

/**
   学生名簿に学生データが存在し、かつ、
   その学生証が直前の読み取りで読み取り済みの場合(何もしない)
*/
exports.Actions.prototype.on_continuous_read = function(ws, deviceIndex, read_status){

    var student = read_status.entry;

    if(DEBUG){
        console.log( read_status.lasttime.get_yyyymmdd_hhmmss() +" > "+ new Date().get_yyyymmdd_hhmmss() );
        console.log( MESSAGE_CONTINUOUS_READ+" "+student.id_code+" "+student.fullname);
    }
};

/**
   学生名簿に学生データが存在し、かつ、
   その学生証が以前の読み取りで読み取り済みの場合(読み取り済み注意を表示)
*/
exports.Actions.prototype.on_notice_ignorance = function(ws, deviceIndex, read_status){

    var student = read_status.entry;

    if(DEBUG){
        console.log( read_status.lasttime.get_yyyymmdd_hhmmss());
        console.log( MESSAGE_ALREADY_READ+" "+student.id_code+" "+student.fullname);
    }

    this.send(ws, {
        command: 'onRead',
        time:read_status.lasttime.getTime(),
        id_code:read_status.id,
        student:student,
        result:MESSAGE_ALREADY_READ,
        deviceIndex: deviceIndex,
        sound: true
    });
};

/**
   学内関係者の名簿にデータが存在しない場合
*/
exports.Actions.prototype.on_error_card = function(ws, deviceIndex, read_status){
    if(DEBUG){
        console.log( read_status.lasttime.get_yyyymmdd_hhmmss());
    }
    
    this.send(ws, {
            command: 'onRead',
            time:read_status.lasttime.getTime(),
            id_code:read_status.id,
            result: MESSAGE_NO_USER,
            deviceIndex: deviceIndex,
            sound: true
        });
};

exports.Actions.prototype.onResumeLoadingStudent = function(ws, date, student){
    this.send(ws, {
            command:'onResume',
            time: date.getTime(),
            id_code:student.id_code,
            student:student,
            result: MESSAGE_ATTEND,
            sound: false
        });
};

exports.Actions.prototype.onResumeLoadingNoMember = function(ws, date, student){
    this.send(ws, {command:'onResume',
               time: date.getTime(),
               id_code:student.id_code,
               result: MESSAGE_NO_MEMBER,
               sound: false
        });
};

exports.Actions.prototype.on_polling = function(ws, deviceIndex){
    this.send(ws, {
            command:'onHeartBeat',
            deviceIndex: deviceIndex
    });
        console.log('send polling');
};

exports.Actions.prototype.on_idle = function(ws, deviceIndex){

    this.send(ws, {
        command:'onIdle',
        deviceIndex: deviceIndex
    });

    this.send(ws, {
            command:'onHeartBeat',
            deviceIndex: deviceIndex
    });
    console.log('send heartBeat');
};
