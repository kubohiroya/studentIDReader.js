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
var MESSAGE_NO_USER = '履修者ではありません';
var MESSAGE_NO_MEMBER = '学内関係者ではありません';
var MESSAGE_CONTINUOUS_READ = '出席(継続読み取り)';
var MESSAGE_ALREADY_READ = '(処理済み)';
var MESSAGE_ADMIN_CONFIG = '教員(管理)';

var DEBUG = false;

/**
   FeliCa学生証読み取り時のアクション
*/
var ViewUpdater = function (ws) {
    this.ws = ws;
};

ViewUpdater.prototype.update = function (socket, object) {
    var data = JSON.stringify(object);
    if (socket && socket.authorized){
        socket.send(data);
    }else{
        console.log("[warn] unauthorized -- ignore: "+data);
    }
}

ViewUpdater.prototype.updateAll = function (object) {
    if (! this.ws || ! this.ws.clients) {
        console.log("[warn] ws or ws.client is udefined.");
        return;
    }

    var vu = this;
    this.ws.clients.forEach(
        function (clientSocket) {
            vu.update(clientSocket, object);
        }
    );
};


/**
   教員カードを読み取った場合
*/
ViewUpdater.prototype.onAdminConfig = function (deviceIndex, readStatus) {

    if (DEBUG) {
        console.log("ADMIN: " + readStatus.time.get_yyyymmdd_hhmmss());
    }

    var teacher = readStatus.entry;

    this.updateAll({
        command: 'onAdminCardReading',
        time: readStatus.time.getTime(),
        teacherID: readStatus.userID,
        teacher: teacher,
        result: MESSAGE_ADMIN_CONFIG,
        deviceIndex: deviceIndex,
    });
};

/**
   学生名簿に学生データが存在し、かつ、
   学生証から学籍番号が読み取れた場合
*/
ViewUpdater.prototype.onAttend = function (deviceIndex, readStatus, student, groupID) {

    if (DEBUG) {
        console.log(readStatus.time.get_yyyymmdd_hhmmss());
        console.log(MESSAGE_ATTEND + " " + student.studentID + " " + student.fullname);
    }

    this.updateAll({
        command: 'onRead',
        time: readStatus.time.getTime(),
        student: student,
        groupID: groupID,
        result: MESSAGE_ATTEND,
        deviceIndex: deviceIndex,
        sound: true
    });

};

/**
   学生名簿に学生データが存在し、かつ、
   その学生証が以前の読み取りで読み取り済みの場合(読み取り済み注意を表示)
*/
ViewUpdater.prototype.onNoticeIgnorance = function (deviceIndex, readStatus, student, groupID) {

    if (DEBUG) {
        console.log(readStatus.time.get_yyyymmdd_hhmmss());
        console.log(MESSAGE_ALREADY_READ + " " + student.studentID + " " + student.fullname);
    }

    this.updateAll({
        command: 'onRead',
        time: readStatus.time.getTime(),
        student: student,
        groupID: groupID,
        result: MESSAGE_ALREADY_READ,
        deviceIndex: deviceIndex,
        sound: true
    });
};

/**
   学生名簿に学生データが存在し、かつ、
   その学生証が直前の読み取りで読み取り済みの場合(何もしない)
*/
ViewUpdater.prototype.onContinuousRead = function (deviceIndex, readStatus) {
    if (DEBUG) {
        console.log(readStatus.time.get_yyyymmdd_hhmmss() + " > " + new Date().get_yyyymmdd_hhmmss());
        console.log(MESSAGE_CONTINUOUS_READ + " " + readStatus.userID);
    }
};

/**
   学内関係者の名簿にデータが存在しない場合
*/
ViewUpdater.prototype.onError = function (deviceIndex, readStatus) {
    if (DEBUG) {
        console.log(readStatus.time.get_yyyymmdd_hhmmss());
    }

    this.updateAll({
        command: 'onRead',
        time: readStatus.time.getTime(),
        userID: readStatus.userID,
        result: MESSAGE_NO_USER,
        deviceIndex: deviceIndex,
        sound: true
    });
};

ViewUpdater.prototype.onResumeLoadingStudent = function (date, student) {
    this.updateAll({
        command: 'onResume',
        time: date.getTime(),
        student: student,
        result: MESSAGE_ATTEND,
        sound: false
    });
};

ViewUpdater.prototype.onResumeLoadingNoMember = function (date, student) {
    this.updateAll({
        command: 'onResume',
        time: date.getTime(),
        userID: student.userID,
        result: MESSAGE_NO_MEMBER,
        sound: false
    });
};

ViewUpdater.prototype.onPolling = function (deviceIndex) {
    this.updateAll({
        command: 'onHeartBeat',
        deviceIndex: deviceIndex
    });
};

ViewUpdater.prototype.onIdle = function (deviceIndex) {
    this.updateAll({
        command: 'onIdle',
        deviceIndex: deviceIndex
    });

    this.updateAll({
        command: 'onHeartBeat',
        deviceIndex: deviceIndex
    });    
};

ViewUpdater.prototype.onStartup = function (socket, lecture, enrollmentDB, readStatusList, grouping) {

    var message = {
        'command': 'onStartUp',
        'lecture': lecture,
        'numStudents': (enrollmentDB) ? Object.keys(enrollmentDB).length : 0,
        'enrollmentTable' : enrollmentDB,
        'resumeEntryList': readStatusList.map(function(readStatus){
                var groupID = grouping? grouping.getGroupIndexOf(readStatus.userID) + 1 : undefined;
                return {
                    command: 'onResume',
                    time: readStatus.time.getTime(),
                    groupID: groupID,
                    student: enrollmentDB[readStatus.userID],
                    result: MESSAGE_ATTEND,
                    sound: false
                };
            })
    };

    if (socket) {
        this.update(socket, message);
    } else {
        // update all client views.
        this.updateAll(message);
    }
};

ViewUpdater.prototype.onReaderErrorMessage = function() {
    this.updateAll({
        'command': 'onReaderError',
        'message': 'Reader device is disabled.'
    });
};

exports.ViewUpdater = ViewUpdater;
