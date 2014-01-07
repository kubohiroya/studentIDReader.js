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

var path = require('path');

var lib = {
    //mail : require("./sendmail.js"),
    cuc: require('../lib/cuc.js'),
    grouping: require('../lib/grouping.js'),
    model: require('../lib/model.js'),
    db: require('../lib/db.js'),
    actions: require('../lib/actions.js'),
};

var READ_DELAY = 3000;

/**
   FeliCaカード読み取りセッションクラス
*/
var Session = function (config, teacher_db, lecture, student_db, websocketServer) {
    this.config = config;

    this.teacher_db = teacher_db;
    this.lecture = lecture;
    this.student_db = student_db;

    console.log('lecture:'+lecture.lecture_id);
    this.websocketServer = websocketServer;

    var filename = this.create_filename(this.config.APP.READ_STATUS_FILE_EXTENTION);
    var filename_error = this.create_filename(this.config.APP.READ_ERRROR_FILE_EXTENTION);

    this.read_db = new lib.db.ReadStatusDB(this.config.APP.FIELD_SEPARATOR,
                                           function (id_code, first_datetime, last_datetime, student) {
                                               if(lecture.lecture_id === student.lecture_id){
                                                   return new lib.model.ReadStatus(student.lecture_id, id_code, first_datetime, last_datetime, student);
                                               }else if(student.lecture_id) {
                                                   throw "lecture_id missmatch:" + lecture.lecture_id + " != " + student.lecture_id;
                                               }
                                           });
    this.read_db.open(filename);
    this.read_db.open_error(filename_error);

    this.actions = lib.actions.Actions;

    if (this.config.GROUPING) {
        this.grouping = new lib.grouping.MemberGroups(this.config.NUM_GROUPS);
    }
};

/*
  学生証の読み取り結果を保存してある/これから保存するための、ファイル名を返す。
  @param [String] extension ファイル名の拡張子として指定したい文字列
  @return [String] ファイル名として使われる、現時刻の「年-月-日-曜日-時限」の文字列に、拡張子を加えた文字列を返す。
*/
Session.prototype.create_filename = function (extension) {
    var now = new Date();
    return path.join(this.config.APP.VAR_DIRECTORY, now.get_yyyy_mm_dd_w_y() + '.' + extension);
};


Session.prototype.createReadStatusDatabase = function () {
    // 現在の日時をもとに該当する出席確認済み学生名簿を読み取り、データベースを初期化

    /*
     function (date, student) {
         onReadActions.onResumeLoadingStudent(date, student);
     }
    function (date, student) {
         onReadActions.onResumeLoadingNoMember(date, student);
     }
    */
};

Session.prototype.on_polling = function (pasori_index) {
    this.actions.on_polling(this.websocketServer, pasori_index);
};

Session.prototype.on_idle = function (pasori_index) {
    this.actions.on_idle(this.websocketServer, pasori_index);
};

Session.prototype.on_read_teacher_card = function (pasori_index, teacher) {

    // 現在時刻を取得
    console.log("teacher:" + teacher.id_code);
    var now = new Date();
    var read_status = new lib.model.ReadStatus(this.lecture.lecture_id, teacher.id_code, now, now, teacher);

    this.actions.on_adminConfig(this.websocketServer, pasori_index, read_status);

    return true;
};

Session.prototype.on_read_student_card = function (pasori_index, student) {

    var read_status = this.read_db.get(student.id_code);
    var now = new Date();

    if (read_status) {
        // 読み取り済みの場合
        if (now.getTime() < read_status.lasttime.getTime() + this.config.APP.PASORI_SAME_CARD_READ_IGNORE) {
            // 読み取り済み後3秒以内の場合は、何もしない
            this.actions.on_continuous_read(this.websocketServer, pasori_index, read_status);
        } else {
            // すでに読み取り済みであることを警告
            // 読み取り状況オブジェクトを更新
            read_status.lasttime = now;
            // 読み取り状況オブジェクトを登録
            this.read_db.store(read_status, student);
            this.actions.on_notice_ignorance(this.websocketServer, pasori_index, read_status);
        }
    } else {
        // 読み取り済みではなかった＝新規の読み取りの場合

        if (this.grouping) {
            var groupIndex = this.grouping.chooseRandomCandidateGroupIndex();
            this.grouping.addGroupMember(groupIndex, student.id_code);
            student.group_id = groupIndex + 1;

            try {
                var to = lib.cuc.id2logname(student.id_code) + '@cuc.ac.jp';
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
        read_status = new lib.model.ReadStatus(this.lecture.lecture_id, student.id_code, now, now, student);
        // 読み取り状況オブジェクトを登録
        this.read_db.store(read_status, student);
        this.actions.on_attend(this.websocketServer, pasori_index, read_status);
    }

    return true;
};

Session.prototype.on_read_error = function (pasori_index, id_code) {
    // 学生名簿または教員名簿上にIDが存在しない場合
    var now = new Date();

    var read_status = this.read_db.get_error(id_code);

    if (read_status) {
        // 読み取り済みの場合
        if (now.getTime() < read_status.lasttime.getTime() + READ_DELAY) {
            // 読み取り済み後3秒以内の場合は、「読み取り済み」の警告を表示しない・何もしない
        } else {
            // すでに読み取り済みであることを警告
            // 読み取り状況オブジェクトを更新
            read_status.lasttime = now;
            // 読み取り状況オブジェクトを登録
            this.read_db.store_error(read_status);
            this.actions.on_error(this.websocketServer, pasori_index, read_status);
        }
    } else {
        read_status = new lib.model.ReadStatus(this.lecture.lecture_id, id_code, now, now, {id_code:id_code});
        this.read_db.store_error(read_status);
        this.actions.on_error(this.websocketServer, pasori_index, read_status);
    }
};

// 実際の読み取り処理への分岐
Session.prototype.on_read = function (pasori_index, id_code, check_teacher_idcard) {
    var student = this.student_db[id_code];
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
    var student_db = this.student_db;
    var message = {
        'command': 'onStartUp',
        'lecture': this.lecture,
        'num_students': (this.student_db) ? Object.keys(this.student_db).length : 0,
        'enrollmentTable' : this.student_db,
        'readStatusList': this.read_db.list().map(function(value){
            return {
                command: 'onResume',
                time: value.firsttime.getTime(),
                id_code: value.id_code,
                student: student_db[value.id_code],
                result: '出席',//MESSAGE_ATTEND,
                sound: false
            };
        })
    };

    if (socket) {
        this.actions.send(socket, message);
    } else {
        // update all client views.
        this.actions.sendAll(this.websocketServer, message);
    }
};

Session.showPaSoRiErrorMessage = function (websocketServer) {
    var message = {
        'command': 'onPaSoRiError',
        'message': 'PaSoRi device is disabled.'
    };
    lib.actions.Actions.sendAll(websocketServer, message);
};


exports.Session = Session;