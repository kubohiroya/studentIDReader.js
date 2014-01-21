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

/* global require, console*/
/* jslint node: true */
"use strict";

var CUC = require('../lib/cuc.js');
var ReadStatus = require('../lib/model.js').ReadStatus;
var MemberGroups = require('../lib/grouping.js').MemberGroups;
var AttendeeDB = require('../lib/attendeeDB.js').AttendeeDB;

var ViewUpdater = require('../lib/viewUpdater.js').ViewUpdater;

var READ_DELAY = 3000;

/**
   FeliCaカード読み取りセッションクラス
*/
var Session = function (teacherDB, lecture, enrollmentDB, attendeeDir, attendeeFilenameBase, numGroups, interval, websocketServer) {

    this.teacherDB = teacherDB;
    this.lecture = lecture;
    this.enrollmentDB = enrollmentDB;
    this.interval = interval;
    this.websocketServer = websocketServer;

    if (numGroups) {
        this.grouping = new MemberGroups(numGroups);
    }
    var grouping = this.grouping;

    var readStatusFactory = function (attendFileEntry) {
        if (!attendFileEntry) {
            return undefined;
        } else if (attendFileEntry.lectureID === lecture.lectureID) {
            var yyyymmddhhmmss = (attendFileEntry.yyyymmdd + " " + attendFileEntry.hhmmss);
            var datetime = yyyymmddhhmmss.split(/[\s\-\:\,]/).createDateAs(['year', 'mon', 'day', 'hour', 'min', 'sec']);
            if (grouping && attendFileEntry.groupID) {
                var groupIndex = parseInt(attendFileEntry.groupID) - 1;
                grouping.addGroupMember(groupIndex, attendFileEntry.userID);
            }
            return new ReadStatus(attendFileEntry.lectureID, attendFileEntry.userID, datetime);
        } else if (attendFileEntry.lectureID) {
            console.log("[warn] lectureID missmatch:" + lecture.lectureID + " != " + attendFileEntry.lectureID);
        }
    };

    var attendFileEntryFactory = function (readStatus, student, groupID) {
        return {
            yyyymmdd: readStatus.time.get_yyyymmdd(),
            wdayatime: readStatus.time.get_wdayatime(),
            hhmmss: readStatus.time.get_hhmmss(),
            lectureID: readStatus.lectureID,
            userID: readStatus.userID,
            fullname: student ? student.fullname : undefined,
            furigana: student ? student.furigana : undefined,
            groupID: groupID ? groupID : undefined
        };
    };

    this.attendeeDB = new AttendeeDB(attendeeDir,
        attendeeFilenameBase,
        readStatusFactory,
        attendFileEntryFactory);
};

Session.prototype.onPolling = function (readerIndex) {
    ViewUpdater.onPolling(this.websocketServer, readerIndex);
};

Session.prototype.onIdle = function (readerIndex) {
    ViewUpdater.onIdle(this.websocketServer, readerIndex);
};

Session.prototype.onReadTeacherCard = function (readerIndex, teacher) {
    var now = new Date();
    var readStatus = new ReadStatus(this.lecture.lectureID, teacher.userID, now);
    ViewUpdater.onAdminConfig(this.websocketServer, readerIndex, readStatus);
    return true;
};

Session.prototype.onReadStudentCard = function (readerIndex, student) {

    var now = new Date();
    var groupID = undefined;

    var readStatus = this.attendeeDB.get(student.userID);

    if (readStatus) {
        // 読み取り済みの場合
        var lasttime = this.attendeeDB.getLasttime(student.userID);
        if (lasttime && now.getTime() < lasttime.getTime() + this.interval) {
            // 読み取り済み後、interval ミリ秒以内の場合は、何もしない
            ViewUpdater.onContinuousRead(this.websocketServer, readerIndex, readStatus);
        } else {
            // すでに読み取り済みであることを警告
            // 読み取り状況オブジェクトを更新

            this.attendeeDB.storeLasttime(student.userID, now);

            // 読み取り状況オブジェクトを登録
            if (this.grouping) {
                var groupID = this.grouping.getGroupIndexOf(readStatus.userID) + 1;
                this.attendeeDB.store(readStatus, student, groupID);
            } else {
                this.attendeeDB.store(readStatus, student);
            }

            ViewUpdater.onNoticeIgnorance(this.websocketServer, readerIndex, readStatus, student, groupID);
        }
    } else {
        // 読み取り済みではなかった＝新規の読み取りの場合

        if (this.grouping) {
            var groupIndex = this.grouping.chooseRandomCandidateGroupIndex();
            this.grouping.addGroupMember(groupIndex, student.userID);
            groupID = groupIndex + 1;

            try {
                var to = CUC.id2logname(student.userID) + '@cuc.ac.jp';
                if ('000727' == student.userID) {
                    to = 'hiroya@cuc.ac.jp';
                }
                /*
                mail.send_mail(to,
                               lecture, lecture.teachers,
                               now.getFullYear(), now.getMonth()+1, now.getDate(),
                               now.getWday(), now.getAcademicTime(),
                               "あなたの班は"+student.groupID+"班です．");
                */
            } catch (e) {
                console.log("Exception " + e.stack);
            }
        }

        // 読み取り状況オブジェクトを作成
        readStatus = new ReadStatus(this.lecture.lectureID, student.userID, now);

        // 読み取り状況オブジェクトを登録
        this.attendeeDB.store(readStatus, student, groupID);
        this.attendeeDB.storeLasttime(student.userID, now);

        ViewUpdater.onAttend(this.websocketServer, readerIndex, readStatus, student, groupID);
    }

    return true;
};

Session.prototype.onReadError = function (readerIndex, userID) {
    // 学生名簿または教員名簿上にIDが存在しない場合
    var now = new Date();

    var readStatus = this.attendeeDB.getError(userID);

    if (readStatus) {
        // 読み取り済みの場合
        var lasttime = this.attendeeDB.getLasttime(userID);
        if (now.getTime() < lasttime.getTime() + READ_DELAY) {
            // 読み取り済み後3秒以内の場合は、「読み取り済み」の警告を表示しない・何もしない
            return;
        }
    } else {
        readStatus = new ReadStatus(this.lecture.lectureID, userID, now);
    }

    this.attendeeDB.storeError(readStatus);
    this.attendeeDB.storeLasttime(userID, now);

    ViewUpdater.onError(this.websocketServer, readerIndex, readStatus);
};

// 実際の読み取り処理への分岐
Session.prototype.onRead = function (readerIndex, userID, checkTeacherIdcard) {
    var student = this.enrollmentDB[userID];
    if (checkTeacherIdcard && this.teacherDB) {
        var teacher = this.teacherDB[userID];
        if (teacher && this.onReadTeacherCard(readerIndex, teacher)) {
            return;
        } else if (student && this.onReadStudentCard(readerIndex, student)) {
            return;
        }
    } else if (student) {
        this.onReadStudentCard(readerIndex, student);
        return;
    }

    this.onReadError(readerIndex, userID);
};


Session.prototype.startUpClientView = function (socket) {
    ViewUpdater.onStartup(this.websocketServer, socket,
        this.lecture, this.enrollmentDB, this.attendeeDB.values(), this.grouping);
};

Session.showReaderErrorMessage = function (websocketServer) {
    ViewUpdater.onReaderErrorMessage(websocketServer);
};


exports.Session = Session;