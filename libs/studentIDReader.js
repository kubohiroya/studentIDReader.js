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

/* global require, process, console, __dirname */
/* jslint node: true */

var open = require('open');
var http = require('http');
var ws = require("websocket.io");
var express = require('express');

var pafe = require('../node_modules/node-libpafe/build/Release/pafe');

require('../libs/util/stringUtil.js');
require('../libs/util/dateUtil.js');
require('../libs/util/arrayUtil.js');

var lib = {
    //mail : require("./sendmail.js"),
    cuc: require('../libs/cuc.js'),
    grouping: require('../libs/grouping.js'),
    model: require('../libs/model.js'),
    loader: require('../libs/loader.js'),
    actions: require('../libs/actions.js'),
    db: require('../libs/db.js')
};

function main(config) {

    // 各種Excelファイルを読み取り、データベースを初期化
    var db = lib.loader.load(config.APP.ETC_DIRECTORY,
        config.ENV.PATH_SEPARATOR,
        config.FILENAMES,
        config.APP.ENCODING,
        config.APP.FIELD_SEPARATOR, function (entry) {
        return new lib.model.Teacher(entry.id_code,
            entry.fullname,
            entry.logname);
    }, function (entry) {
        return new lib.model.Student(entry.id_code,
            entry.fullname,
            entry.furigana,
            entry.gender);
    }, function (entry) {
        return new lib.model.Lecture(entry.lecture_id,
            entry.grading_name,
            entry.name,
            entry.teacher_id_code,
            entry.teacher,
            entry.co_teacher_id_code,
            entry.co_teacher,
            config.ayear,
            entry.wday,
            entry.time);
    });

    /*
    if (config.APP.CATCH_SIGINT) {
        process.on('SIGINT', function () {
            console.log("\ngracefully shutting down from  SIGINT (Crtl-C)");
            cardreader.enabled = false;
            process.exit();
        });
    }*/
    
    // WebServerを起動
    var app = express();
    app.configure(function () {
        app.use(express.static(__dirname + "/../views/"));
    });
    var server = http.createServer(app);
    server.listen(config.NET.HTTP_PORT, function(){
            // WebSocketを起動
            var w = ws.listen(config.NET.WS_PORT, function () {
                    if (config.APP.AUTO_LAUNCH_BROWSER) {
                        open('http://localhost:' + config.NET.HTTP_PORT);
                    }
                    w.on("connection", function (socket) {
                            start(config, lib.model, db, new lib.actions.OnReadActions(w));
                        });
                });
            
            if (!config.APP.AUTO_LAUNCH_BROWSER) {
                start(config, lib.model, db, new lib.actions.OnReadActions(w));
            }
        });
}

/**
   FeliCaカード読み取りクラス
*/
var CardReader = function (config, model, db, read_db, onReadActions) {
    this.config = config;
    this.enabled = true;

    if(config.GROUPING){
        this.grouping = new lib.grouping.MemberGroups(config.NUM_GROUPS);
    }

    this.teacher_db = db.teachers;
    this.student_db = db.students;
    this.lecture_db = db.lectures;
    this.member_db = db.members;
    this.read_db = read_db;
    this.onReadActions = onReadActions;
};

CardReader.prototype.on_polling = function (pasori_index) {
    this.onReadActions.on_polling(pasori_index);
};

CardReader.prototype.on_idle = function (pasori_index) {
    this.onReadActions.on_idle(pasori_index);
};

CardReader.prototype.on_read_teacher_card = function (pasori_index, id_code) {

    if (id_code.length != 6) {
        console.log("UNDEFINED ID_CODE:" + id_code + " " + id_code.length);
        return false;
    }

    var teacher = this.teacher_db[id_code];

    if (!teacher) {
        // IDから教職員を特定できなかった場合
        console.log("UNDEFINED TEACHER:" + id_code + " in " + (this.teacher_db.length) + " definitions.");
        return false;
    }

    // 現在時刻を取得
    console.log("teacher:"+ id_code);
    var now = new Date();
    var read_status = new lib.model.ReadStatus(id_code, now, now, teacher);

    this.onReadActions.on_adminConfig(pasori_index, read_status);

    return true;
};

CardReader.prototype.on_read_student_card = function (pasori_index, id_code, lecture_id) {
    var student = this.student_db[id_code];

    if (!student) {
        // IDコードから学生を特定できなかった場合
        console.log("UNDEFINED ID_CODE:" + id_code + " in " + (Object.keys(this.student_db).length) + " definitions.");
        return false;
    }

    if (!this.lecture_db.lecture_id_map[lecture_id]) {
        // 現在の出欠確認対象科目を設定できなかった場合
        console.log("UNDEFINED LECTURE:" + lecture_id + " in " + Object.keys(this.lecture_db.id_code_map).length + " definitions.");
        return false;
    }

    if (!this.member_db[lecture_id]) {
        // 現在の出欠確認対象科目の履修者を設定できなかった場合
        console.log("NO MEMBER LECTURE:" + lecture_id + " in " + Object.keys(this.member_db).length + " definitions.");
        return false;
    }

    if (!this.member_db[lecture_id][id_code]) {
        // その学生が現在の出欠確認対象科目の履修者ではない場合
        console.log("INVALID ATTENDEE :" + id_code + " of " + lecture_id + "(" + Object.keys(this.member_db[lecture_id]).length + " members)");
        return false;
    }

    var read_status = this.read_db.get(id_code);
    var now = new Date();

    if (read_status) {
        // 読み取り済みの場合
        if (now.getTime() < read_status.lasttime.getTime() + this.config.FELICA.READ_DELAY) {
            // 読み取り済み後3秒以内の場合は、何もしない
            this.onReadActions.on_continuous_read(pasori_index, read_status);
        } else {
            // すでに読み取り済みであることを警告
            // 読み取り状況オブジェクトを更新
            read_status.lasttime = now;
            // 読み取り状況オブジェクトを登録
            this.read_db.store(read_status, student);
            this.onReadActions.on_notice_ignorance(pasori_index, read_status);
        }
    } else {
        // 読み取り済みではなかった＝新規の読み取りの場合

        if (this.grouping) {
            var groupIndex = this.grouping.chooseRandomCandidateGroupIndex();
            this.grouping.addGroupMember(groupIndex, id_code);
            student.group_id = groupIndex + 1;

            try {
                var to = lib.cuc.id2logname(id_code) + '@cuc.ac.jp';
                if ('000727' == id_code) {
                    to = 'hiroya@cuc.ac.jp';
                }
                /*
                mail.send_mail(to, 
                               config.lecture.name, config.teachers,
                               now.getFullYear(), now.getMonth()+1, now.getDate(),
                               now.getWday(), now.getAcademicTime(),
                               "あなたの班は"+student.group_id+"班です．");
                */
            } catch (e) {
                console.log(e);
            }
        }

        // 読み取り状況オブジェクトを作成
        read_status = new lib.model.ReadStatus(id_code, now, now, student);
        // 読み取り状況オブジェクトを登録
        this.read_db.store(read_status, student);
        this.onReadActions.on_attend(pasori_index, read_status);

    }

    return true;
};

CardReader.prototype.on_read_error = function (pasori_index, data) {
    // 学生名簿または教員名簿上にIDが存在しない場合
    var now = new Date();

    var read_status = this.read_db.get_error(data);

    if (read_status) {
        // 読み取り済みの場合
        if (now.getTime() < read_status.lasttime.getTime() + this.config.FELICA.READ_DELAY) {
            // 読み取り済み後3秒以内の場合は、何もしない
        } else {
            // すでに読み取り済みであることを警告
            // 読み取り状況オブジェクトを更新
            read_status.lasttime = now;
            // 読み取り状況オブジェクトを登録
            this.read_db.store_error_card(read_status);
            this.onReadActions.on_error_card(pasori_index, read_status);
        }
    } else {
        read_status = new lib.model.ReadStatus(data, now, now, {});
        this.onReadActions.on_error_card(pasori_index, read_status);
        this.read_db.store_error_card(read_status);
    }
};

// 実際の読み取り処理への分岐
CardReader.prototype.on_read_teacher_then_student = function (pasori_index, id_code, lecture_id) {
    if (this.on_read_teacher_card(pasori_index, id_code)) {
        return;
    } else if (this.on_read_student_card(pasori_index, id_code, lecture_id)) {
        return;
    }
    this.on_read_error(pasori_index, id_code, lecture_id);

};

CardReader.prototype.on_read_student_then_teacher = function (pasori_index, id_code, lecture_id) {
    if (this.on_read_student_card(pasori_index, id_code, lecture_id)) {
        return;
    } else if (this.on_read_teacher_card(pasori_index, id_code)) {
        return;
    }
    this.on_read_error(pasori_index, id_code, lecture_id);
};

/**
   この関数内で、FeliCaのポーリング、IDコードの読み出し、処理を行う。
   この関数内で読み取りループが行われるので、呼び出しはブロックする。
*/
CardReader.prototype.polling = function (lecture_id, pasoriArray) {
    var DEBUG = true;

    if (!pasoriArray) {
        throw "ERROR: pasoriArray == NULL.";
    }

    while (this.enabled) {

        for (var pasori_index = 0; pasori_index < pasoriArray.length; pasori_index++) {
            var pasori = pasoriArray[pasori_index];

            if (!pasori) {
                console.log("\nPaSoRi ERROR.");
                this.enabled = false;
                pasori.close();
                process.exit();
            }

            this.on_polling(pasori_index);

            var felica;
            try {
                pasori.reset();
                pasori.set_timeout(1000);
                if (DEBUG) {
                    console.log("POLLING....");
                }
                felica = pasori.polling(this.config.FELICA.SYSTEM_CODE.FELICA_LITE,
                    this.config.FELICA.POLLING_TIMESLOT);
                if (DEBUG) {
                    console.log("  READ_SINGLE....");
                }
                var data = felica.read_single(this.config.CARDREADER.SERVICE_CODE,
                    0,
                    this.config.CARDREADER.ID_INFO.BLOCK_NUM);
                if (DEBUG) {
                    console.log("    DONE....");
                }
                if (data) {

                    //var pmm = felica.get_pmm().toHexString();

                    var id_code = data.substring(this.config.CARDREADER.ID_INFO.BEGIN_AT,
                                                 this.config.CARDREADER.ID_INFO.END_AT);
                    if(id_code.endsWith("_")){
                        id_code = id_code.substring(0, id_code.length - 1);
                    }

                    if (DEBUG) {
                        console.log("  id_code " + id_code);
                    }

                    if (this.config.CARDREADER.CHECK_ORDER_TEACHER_STUDENT) {
                        this.on_read_teacher_then_student(pasori_index, id_code, lecture_id);
                    } else {
                        this.on_read_student_then_teacher(pasori_index, id_code, lecture_id);
                    }
                }
            } catch (e) {

                //console.log(" ERROR=" + pasori.get_error_code());

                this.on_idle(pasori_index);

            } finally {
                if (felica) {
                    felica.close();
                    felica = undefined;
                }
            }
        }
    }
};

function start(config, model, db, onReadActions) {
    var lecture_id = config.LECTURE_ID;
    var lecture = db.lectures.lecture_id_map[lecture_id];
    var teachers = (lecture.co_teacher_id_code) ? [lecture.teacher, lecture.co_teacher].join(' ') : lecture.teacher;
    var members = db.members[lecture_id];
    var max_members = (members) ? Object.keys(members).length : 0;
    onReadActions.onStartUp(lecture, teachers, max_members);

    config.lecture = lecture;
    config.teachers = teachers;
    config.max_members = max_members;

    // 現在の日時をもとに該当する出席確認済み学生名簿を読み取り、データベースを初期化
    var read_status_db = new lib.db.ReadStatusDB(config,
        config.READ_STATUS_FIELD_KEYS, function (id_code, first_date, last_date, student) {
        return new model.ReadStatus(id_code, first_date, last_date, student);
    }, function (date, student) {
        onReadActions.onResumeLoadingStudent(date, student);
    }, function (date, student) {
        onReadActions.onResumeLoadingNoMember(date, student);
    });

    var card_reader = new CardReader(config, model, db,
        read_status_db, onReadActions);

    if (config.APP.HAVE_PASORI) {
        var pasoriArray = pafe.open_pasori_multi();
        if (!pasoriArray) {
            console.log("fail to open pasori.");
            return;
        }
        for (var i = 0; i < pasoriArray.length; i++) {
            var pasori = pasoriArray[i];
            pasori.init();
            pasori.set_timeout(config.PASORI.TIMEOUT);
        }
        card_reader.polling(lecture_id, pasoriArray); //この関数の呼び出しはブロックする
    } else {
        var pasori_index = 0;
        var id_code = config.DUMMY_ID_CODE;
        card_reader.on_read_teacher_then_student(pasori_index, id_code, lecture_id);
        //process.exit();
    }
}

exports.main = main;
