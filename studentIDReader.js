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
var DEBUG = false;

var iconv = require('iconv');
var path = require('path');
var open = require('open');
var express = require('express');
var http = require('http');
var ws = require("websocket.io");

var pafe = require('./node_modules/node-libpafe/build/Release/pafe');

require('./stringUtil.js');
require('./dateUtil.js');
require('./arrayUtil.js');
require('./readStatusDB.js');
require('./actions.js')

var model = require('./model.js');

var CONST = require('./const.js');
var CONFIG = require('./config.js');

;

require('./loader.js');

var lecture_id = CONFIG.LECTURE_ID;
var pollingLoop = true;

//------------------------------------------------------------------------------
if(CONST.APP.CATCH_SIGINT){
    process.on('SIGINT', function () {
            console.log( "\ngracefully shutting down from  SIGINT (Crtl-C)" );
            pollingLoop = false;
            process.exit();
        });
}


/**
   FeliCaカード読み取りクラス
*/
var CardReader = function(db, read_db, onReadActions){
    this.teacher_db = db.teachers;
    this.student_db = db.students;
    this.lecture_db = db.lectures;
    this.member_db = db.members;
    this.read_db = read_db;
    this.onReadActions = onReadActions;
};

CardReader.prototype.on_polling = function(deviceIndex){
    this.onReadActions.on_polling(deviceIndex);
};

CardReader.prototype.on_idle = function(deviceIndex){
    this.onReadActions.on_idle(deviceIndex);
};

// 実際の読み取り処理への分岐
CardReader.prototype.on_read = function(deviceIndex, data, lecture_id){

        var match = data.match(/^([A-Za-z0-9]+)/i);
        var data = match[0];

        var card_type = data.substring(0, 2);
        var id_code = data.substring(CONST.CARDREADER.ID_INFO.BEGIN_AT,
                                     CONST.CARDREADER.ID_INFO.END_AT);
        
        if(CONST.CARDREADER.CHECK_ORDER_TEACHER_STUDENT){
            if(this.on_read_teacher_card(deviceIndex, id_code, lecture_id)){
                return;
            }else if(this.on_read_student_card(deviceIndex, id_code, lecture_id)){
                return;
            }
        }else{
            if(this.on_read_student_card(deviceIndex, id_code, lecture_id)){
                return;
            }else if(this.on_read_teacher_card(deviceIndex, id_code, lecture_id)){
                return;
            }
        }

        this.on_read_error(deviceIndex, id_code, lecture_id);
};

CardReader.prototype.on_read_teacher_card = function(deviceIndex, id_code, lecture_id){

    if(id_code.length != 6){
        console.log("UNDEFINED ID_CODE:"+id_code+" "+id_code.length);
        return false;
    }

    var teacher = this.teacher_db[id_code];

    if(! teacher){
        // IDから教職員を特定できなかった場合
        console.log("UNDEFINED TEACHER:"+id_code+" in "+(this.teacher_db.length)+" definitions.");
        return false;
    }

    // 現在時刻を取得
    var now = new Date();
    var read_status = new model.ReadStatus(id_code, now, now);

    this.onReadActions.on_adminConfig(deviceIndex, read_status, teacher);

    return true;
};

CardReader.prototype.on_read_student_card = function(deviceIndex, id_code, lecture_id){
    var student = this.student_db[id_code];

    if(! student){
        // IDコードから学生を特定できなかった場合
        console.log("UNDEFINED ID_CODE:"+id_code+" in "+(Object.keys(this.student_db).length)+" definitions.");
        return false;
    }

    if(! this.lecture_db.lecture_id_map[lecture_id]){
        // 現在の出欠確認対象科目を設定できなかった場合
        console.log("UNDEFINED LECTURE:"+lecture_id+" in "+Object.keys(this.lecture_db.id_code_map).length+" definitions.");
        return false;
    }

    if(! this.member_db[lecture_id]){
        // 現在の出欠確認対象科目の履修者を設定できなかった場合
        console.log("NO MEMBER LECTURE:"+lecture_id+" in "+Object.keys(this.member_db).length+" definitions.");
        return false;
    }

    if(! this.member_db[lecture_id][id_code]){
        // その学生が現在の出欠確認対象科目の履修者ではない場合
        console.log("INVALID ATTENDEE :"+id_code+" of "+lecture_id+"("+Object.keys(this.member_db[lecture_id]).length+" members)");
        return false;
    }

    var read_status = this.read_db.get(id_code);
    var now = new Date();

    if(read_status){
        // 読み取り済みの場合
        if(now.getTime() < read_status.lasttime.getTime() + CONST.FELICA.READ_DELAY){
            // 読み取り済み後3秒以内の場合は、何もしない
            this.onReadActions.on_continuous_read(deviceIndex, read_status, student);
        }else{
            // すでに読み取り済みであることを警告
            // 読み取り状況オブジェクトを更新
            read_status.lasttime = now;
            // 読み取り状況オブジェクトを登録
            this.read_db.store(read_status, student);
            this.onReadActions.on_notice_ignorance(deviceIndex, read_status, student);
        }
    }else{
        // 読み取り済みではなかった＝新規の読み取りの場合
        // 読み取り状況オブジェクトを作成
        var read_status = new model.ReadStatus(id_code, now, now);
        // 読み取り状況オブジェクトを登録
        this.read_db.store(read_status, student);
        this.onReadActions.on_attend(deviceIndex, read_status, student);
    }

    return true;
};

CardReader.prototype.on_read_error = function(deviceIndex, data, lecture_id){
    // 学生名簿または教員名簿上にIDが存在しない場合
    var now = new Date();

    var read_status = this.read_db.get_error(data);

    if(read_status){
        // 読み取り済みの場合
        if(now.getTime() < read_status.lasttime.getTime() + CONST.FELICA.READ_DELAY){
            // 読み取り済み後3秒以内の場合は、何もしない
        }else{
            // すでに読み取り済みであることを警告
            // 読み取り状況オブジェクトを更新
            read_status.lasttime = now;
            // 読み取り状況オブジェクトを登録
            this.read_db.store_error_card(read_status);
            this.onReadActions.on_error_card(deviceIndex, read_status);
        }
    }else{
        read_status = new model.ReadStatus(data, now, now);
        this.onReadActions.on_error_card(deviceIndex, read_status);
        this.read_db.store_error_card(read_status);
    }
};


/**
 この関数内で、FeliCaのポーリング、IDコードの読み出し、処理を行う。
 この関数内で読み取りループが行われるので、呼び出しはブロックする。
*/
CardReader.prototype.polling = function(pasoriArray){

    if(! pasoriArray){
        throw "ERROR: pasoriArray == NULL.";
    }

    while(pollingLoop){
        
        for(var pasoriIndex = 0; pasoriIndex < pasoriArray.length; pasoriIndex++){
            var pasori = pasoriArray[pasoriIndex];

            if(! pasori){
                console.log( "\nPaSoRi ERROR." );
                pollingLoop = false;
                pasori.close();
                process.exit();
            }

            this.on_polling(pasoriIndex);

            try{
                var felica = pasori.polling(CONST.FELICA.SYSTEM_CODE.FELICA_LITE,
                                            CONST.FELICA.POLLING_TIMESLOT);

                var data = felica.read_single(CONST.CARDREADER.SERVICE_CODE,
                                              0,
                                              CONST.CARDREADER.ID_INFO.BLOCK_NUM);
                if(data){
                    if(DEBUG){
                        console.log("  data "+data);
                    }

                    //should we check PMm?
                    if(DEBUG){
                        console.log("PMm:"+felica.get_pmm().toHexString());
                    }
                    this.on_read(pasoriIndex, data, lecture_id);
                }
            }catch(e){

                console.log("   error_code=" + pasori.get_error_code());

                this.on_idle(pasoriIndex);

            }finally{
                if(felica){
                    felica.close();
                    felica = undefined;
                }
            }
        }
    }
};

// ----------------------------------------------------------

// 各種Excelファイルを読み取り、データベースを初期化
var db = loadDefs(CONST.APP.ETC_DIRECTORY, 
                  CONST.ENV.PATH_SEPARATOR, 
                  CONFIG.FILENAMES,
                  CONST.APP.FIELD_SEPARATOR,
                  function(entry){
                      return new model.Teacher(entry.id_code,
                                               entry.fullname,
                                               entry.logname);
                  },
                  function(entry){
                      return new model.Student(entry.id_code,
                                               entry.fullname,
                                               entry.furigana,
                                               entry.gender);
                  },
                  function(entry){
                      return new model.Lecture(entry.lecture_id,
                                               entry.grading_name,
                                               entry.name,
                                               entry.teacher_id_code,
                                               entry.teacher,
                                               entry.co_teacher_id_code,
                                               entry.co_teacher,
                                               entry.wday, 
                                               entry.time);
                  });

// WebServerを起動
var app = express();
app.configure(function(){
    app.use(express.static(__dirname+"/views"));
});

var server = http.createServer(app);
server.listen(CONST.NET.HTTP_PORT);

var ws = ws.listen(CONST.NET.WS_PORT,
                   function () {
                       
                       if(CONST.APP.AUTO_LAUNCH_BROWSER){
                           open('http://localhost:'+CONST.NET.HTTP_PORT);
                       }

                       ws.on("connection",
                             function(socket) {
                                 console.log("connected:"+lecture_id);
                                 main(lecture_id);
                             });
                   }
                   );

// 読み取り結果の表示アクションを指定
var onReadActions = new OnReadActions(ws);

function main(lecture_id){
    var lecture = db.lectures.lecture_id_map[lecture_id];
    var teachers = [lecture.teacher, lecture.co_teacher].join(' ');
    var members = db.members[lecture_id];
    var max_members = (members) ? Object.keys(members).length : 0;
    onReadActions.onStartUp(lecture, teachers, max_members);

    // 現在の日時をもとに該当する出席確認済み学生名簿を読み取り、データベースを初期化
    var read_db = new ReadStatusDB(CONST,
                                   function(date, student){
                                       onReadActions.onResumeLoadingStudent(date, student);
                                   }, 
                                   function(date, student){
                                       onReadActions.onResumeLoadingNoMember(date, student);
                                   },
                                   function(id_code, date, date){
                                       return new model.ReadStatus(id_code, date, date);
                                   });

    var cardReader = new CardReader(db,
                                    read_db, onReadActions);

    if(CONST.APP.HAVE_PASORI){
        var pasoriArray = pafe.open_pasori_multi();
        if(! pasoriArray){
            console.log("fail to open pasori.");
            return;
        }
        for(var i = 0; i < pasoriArray.length; i++){
            var pasori = pasoriArray[i];
            pasori.init();
            pasori.set_timeout(CONST.PASORI.TIMEOUT);
        }
        cardReader.polling(pasoriArray);//この関数の呼び出しはブロックする
    }
}

if(! CONST.APP.AUTO_LAUNCH_BROWSER){
    main(lecture_id);
}
