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

var UpdateView = require('../lib/updateView.js').UpdateView;

var READ_DELAY = 3000;

/**
   FeliCaカード読み取りセッションクラス
*/
var Session = function (config, teacher_db, lecture, enrollment_db, attendee_dir, websocketServer) {
    this.config = config;

    this.teacher_db = teacher_db;
    this.lecture = lecture;
    this.enrollment_db = enrollment_db;

    this.websocketServer = websocketServer;

    if (this.config.GROUPING) {
        this.grouping = new MemberGroups(this.config.NUM_GROUPS);
    }
    var grouping = this.grouping;

    var readStatusFactory = function (attendFileEntry) {
        if (! attendFileEntry) {
            return undefined;
        }else if(attendFileEntry.lecture_id === lecture.lecture_id){
            var yyyymmddhhmmss = (attendFileEntry.yyyymmdd + " " + attendFileEntry.hhmmss);
            var datetime = yyyymmddhhmmss.split(/[\s\-\:\,]/).createDateAs(['year', 'mon', 'day', 'hour', 'min', 'sec']);
            if (grouping && attendFileEntry.group_id) {
                var groupIndex = parseInt(attendFileEntry.group_id) - 1;
                grouping.addGroupMember(groupIndex, attendFileEntry.id_code);
            }
            return new ReadStatus(attendFileEntry.lecture_id, attendFileEntry.id_code, datetime);
        }else if(attendFileEntry.lecture_id) {
            throw "lecture_id missmatch:" + lecture.lecture_id + " != " + attendFileEntry.lecture_id;
        }
    };

    var attendFileEntryFactory = function(read_status, student, group_id){
        return {
            yyyymmdd : read_status.time.get_yyyymmdd(),
            wdayatime : read_status.time.get_wdayatime(),
            hhmmss : read_status.time.get_hhmmss(),
            lecture_id : read_status.lecture_id,
            id_code : read_status.id_code,
            fullname: student? student.fullname : undefined,
            furigana: student? student.furigana : undefined,
            group_id: group_id? group_id : undefined,
            getKey: function(){return read_status.id_code;}
        };
    };

    this.attendee_db = new AttendeeDB(attendee_dir,
                                      readStatusFactory,
                                      attendFileEntryFactory);
    this.attendee_db.open();
};

Session.prototype.on_polling = function (pasori_index) {
    UpdateView.on_polling(this.websocketServer, pasori_index);
};

Session.prototype.on_idle = function (pasori_index) {
    UpdateView.on_idle(this.websocketServer, pasori_index);
};

Session.prototype.on_read_teacher_card = function (pasori_index, teacher) {
    var now = new Date();
    var read_status = new ReadStatus(this.lecture.lecture_id, teacher.id_code, now);
    UpdateView.on_adminConfig(this.websocketServer, pasori_index, read_status);
    return true;
};

Session.prototype.on_read_student_card = function (pasori_index, student) {

    var now = new Date();
    var group_id = undefined;

    var read_status = this.attendee_db.get(student.id_code);

    if (read_status) {
        // 読み取り済みの場合
        var lasttime = this.attendee_db.get_lasttime(student.id_code);
        if (lasttime && now.getTime() < lasttime.getTime() + this.config.APP.PASORI_SAME_CARD_READ_IGNORE) {
            // 読み取り済み後3秒以内の場合は、何もしない
            UpdateView.on_continuous_read(this.websocketServer, pasori_index, read_status);
        } else {
            // すでに読み取り済みであることを警告
            // 読み取り状況オブジェクトを更新

            this.attendee_db.store_lasttime(student.id_code, now);

            // 読み取り状況オブジェクトを登録
            var group_id = this.grouping.getGroupIndexOf(read_status.id_code) + 1;
            this.attendee_db.store(read_status, student, group_id);
            UpdateView.on_notice_ignorance(this.websocketServer, pasori_index, read_status, student, group_id);
        }
    } else {
        // 読み取り済みではなかった＝新規の読み取りの場合

        if (this.grouping) {
            var groupIndex = this.grouping.chooseRandomCandidateGroupIndex();
            this.grouping.addGroupMember(groupIndex, student.id_code);
            group_id = groupIndex + 1;

            try {
                var to = CUC.id2logname(student.id_code) + '@cuc.ac.jp';
                if ('000727' == student.id_code) {
                    to = 'hiroya@cuc.ac.jp';
                }
                /*
                mail.send_mail(to,
                               lecture, lecture.teachers,
                               now.getFullYear(), now.getMonth()+1, now.getDate(),
                               now.getWday(), now.getAcademicTime(),
                               "あなたの班は"+student.group_id+"班です．");
                */
            } catch (e) {
                console.log("Exception "+e.stack);
            }
        }

        // 読み取り状況オブジェクトを作成
        read_status = new ReadStatus(this.lecture.lecture_id, student.id_code, now);

        // 読み取り状況オブジェクトを登録
        this.attendee_db.store(read_status, student, group_id);
        this.attendee_db.store_lasttime(student.id_code, now);

        UpdateView.on_attend(this.websocketServer, pasori_index, read_status, student, group_id);
    }

    return true;
};

Session.prototype.on_read_error = function (pasori_index, id_code) {
    // 学生名簿または教員名簿上にIDが存在しない場合
    var now = new Date();

    var read_status = this.attendee_db.get_error(id_code);

    if (read_status) {
        // 読み取り済みの場合
        var lasttime = this.attendee_db.get_lasttime(student.id_code);
        if (now.getTime() < lasttime.getTime() + READ_DELAY) {
            // 読み取り済み後3秒以内の場合は、「読み取り済み」の警告を表示しない・何もしない
            return;
        }
    } else {
        read_status = new ReadStatus(this.lecture.lecture_id, id_code, now);
    }

    this.attendee_db.store_error(read_status);
    this.attendee_db.store_lasttime(id_code, now);

    UpdateView.on_error(this.websocketServer, pasori_index, read_status);
};

// 実際の読み取り処理への分岐
Session.prototype.on_read = function (pasori_index, id_code, check_teacher_idcard) {
    var student = this.enrollment_db[id_code];
    if (check_teacher_idcard && this.teacher_db) {
        var teacher = this.teacher_db[id_code];
        if (teacher && this.on_read_teacher_card(pasori_index, teacher)) {
            return;
        } else if (student && this.on_read_student_card(pasori_index, student)) {
            return;
        }
    } else if (student){
        this.on_read_student_card(pasori_index, student);
        return;
    }

    this.on_read_error(pasori_index, id_code);
};


Session.prototype.startUpClientView = function (socket) {
    UpdateView.on_startup(this.lecture, this.enrollment_db, this.attendee_db.values(), this.websocketServer, socket);
};

Session.showPaSoRiErrorMessage = function (websocketServer) {
    UpdateView.on_pasoriErrorMessage(websocketServer);
};


exports.Session = Session;