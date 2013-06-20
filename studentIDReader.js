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
var DEBUG = true;

var iconv = require('iconv');
var fs = require('fs');
var path = require('path');

var open = require('open');
var express = require('express');
var http = require('http');
var ws = require("websocket.io");

var forEachLine = require('./forEachLine.js');
var stringUtil = require('./stringUtil.js');
var dateUtil = require('./dateUtil.js');
var dateUtil = require('./arrayUtil.js');

var pafe = require('./node_modules/node-libpafe/build/Release/pafe');

var CONST = require('./const.js');
var config = require('./config.js');

var model = require('./model.js');
var loader = require('./loader.js');
var actions = require('./actions.js');

var lecture_id = config.args.LECTURE_ID;
var pollingLoop = true;

//------------------------------------------------------------------------------
if(CONST.APP.CATCH_SIGINT){
    process.on('SIGINT', function () {
            console.log( "\ngracefully shutting down from  SIGINT (Crtl-C)" );
            pollingLoop = false;
            pafe.pasori_close();
            process.exit();
    });
}


/**
   IDカードの読み取り結果を、ファイルとメモリ上のハッシュテーブルの両方に対して、
   同期した形で保存していくような動作をするデータベースを表すクラス
*/
ReadStatusDB = function(callbackOnSuccess, callbackOnError){
    this.attendance_db = {};
    var attendance_db = this.attendance_db;
    this.error_db = {};
    var error_db = this.error_db;

    this.filename = this.get_filename(CONST.APP.READ_STATUS_FILE_EXTENTION);
    this.filename_error_card = this.get_filename(CONST.APP.READ_ERRROR_FILE_EXTENTION);

    if(fs.existsSync(this.filename)){
        forEachLine.forEachLineSync(this.filename, {
                encoding: CONST.ENV.ENCODING, 
                    separator: CONST.APP.FIELD_SEPARATOR
                    },
            ['yyyymmdd','wdayatime','hhmmss','id_code','fullname','furigana'],
            function(entry){
                var yyyymmddhhmmss = (entry.yyyymmdd+" "+entry.hhmmss);
                var date = yyyymmddhhmmss.split(/[\s\-\:\,]/).createDateAs(['year','mon','day','hour','min','sec'] );
                attendance_db[entry.id_code] = new model.ReadStatus(entry.id_code, date, date);
                callbackOnSuccess(date, entry);
            });
    }

    if(fs.existsSync(this.filename_error_card)){
        forEachLine.forEachLineSync(this.filename_error_card, {
                encoding: CONST.ENV.ENCODING, 
                separator: CONST.APP.FIELD_SEPARATOR
            },
            ['yyyymmdd','wdayatime','hhmmss','id_code'],
            function(entry){
                var yyyymmddhhmmss = (entry.yyyymmdd+" "+entry.hhmmss);
                var date = yyyymmddhhmmss.split(/[\s\-\:\,]/).createDateAs(['year','mon','day','hour','min','sec'] );
                error_db[entry.id_code] = new model.ReadStatus(entry.id_code, date, date);
                callbackOnError(date, entry);
            });
    }
};

/**
   メモリ上のデータベースを初期化する
*/
ReadStatusDB.prototype.clear_memory=function(){
    this.attendance_db = {};
    this.error_db = {};
};

/*
  学生証の読み取り結果を保存してある/これから保存するための、ファイル名を返す。
  @param [String] extension ファイル名の拡張子として指定したい文字列
  @return [String] ファイル名として使われる、現時刻の「年-月-日-曜日-時限」の文字列に、拡張子を加えた文字列を返す。
*/
ReadStatusDB.prototype.get_filename=function(extension){
    var now = new Date();
    return CONST.APP.VAR_DIRECTORY + 
    CONST.ENV.PATH_SEPARATOR + now.get_yyyy_mm_dd_w_y()+'.'+extension;
};

/**
   その学生証が、現在の時限において読み取り済みかどうかを返す
   @param [String] id_code IDコード
   @return [Boolean] その学生証が、現在の時限において読み取り済みかどうか
*/
ReadStatusDB.prototype.exists=function(id_code){
    return this.attendance_db[id_code] != null;
};

/**
   IDコードを与えると、その学生の読み取り状況を表すオブジェクトを返す
   @param [String] id_code IDコード
   @return [ReadStatus] 読み取り済みに場合には、読み取り状況を表すオブジェクト。まだ読み取っていない場合にはnull。
*/
ReadStatusDB.prototype.get=function(id_code){
    return this.attendance_db[id_code];
};

/**
   IDコードを与えると、その学生の読み取り状況を表すオブジェクトを返す
   @param [String] id_code IDコード
   @return [ReadStatus] 読み取り済みに場合には、読み取り状況を表すオブジェクト。まだ読み取っていない場合にはnull。
*/
ReadStatusDB.prototype.get_error=function(id){
    return this.error_db[id];
};

/**
   学生証の読み取り結果をデータベースに保存する
   @param [ReadStatus] read_status　読み取り状況を表すオブジェクト
   @param [Student] student 学生オブジェクト
*/
ReadStatusDB.prototype.store = function(read_status, student){
    //必要に応じて保存先ファイルを切り替える
    var filename = this.get_filename(CONST.APP.READ_STATUS_FILE_EXTENTION);
    if(this.filename != filename){
        // 元のファイルはクローズし、新しく現時刻の時限のファイルを開く
        console.log('open:'+filename);
        this.filename = filename;
        this.clear_memory();
    }
    // このIDコードの学生の読み取り状況をメモリ上のデータベースに登録する
    this.attendance_db[read_status.id_code] = read_status;

    // このIDコードの学生の読み取り状況をファイル上の1行として保存する
    var yyyymmdd = read_status.lasttime.get_yyyymmdd();
    var wdayatime = read_status.lasttime.get_wdayatime();
    var hhmmss = read_status.lasttime.get_hhmmss();

    var line = [yyyymmdd, wdayatime, hhmmss, student.id_code,
                student.fullname, student.furigana, student.gender].join(CONST.APP.FIELD_SEPARATOR)+"\n";
    
    fs.appendFileSync(this.filename, line, {encoding: CONST.ENV.ENCODING});
    console.log(student.id_code);
};

/**
   名簿にない学生の学生証の読み取り結果を保存する
   @param [ReadStatus] read_status 読み取り状況オブジェクト
   @return 保存した「名簿にない学生の学生証」の通し番号を返す。もしその学生証がすでに保存済みのものならば、-1を返す
*/
ReadStatusDB.prototype.store_error_card = function(read_status){

    if(this.error_db[read_status.id_code] != null){
        // すでに保存済みの「名簿にないIDカード」ならば-1を返して終了
        return -1;
    }

    //必要に応じて保存先ファイルを切り替える
    var filename_error_card = this.get_filename(CONST.APP.READ_ERRROR_FILE_EXTENTION);

    if(this.filename_error_card != filename_error_card){
        console.log('open:'+filename_error_card);
        this.filename_error_card = filename_error_card;
        this.clear_memory();
    }
    
    // このIDカードの読み取り状況をメモリ上のデータベースに登録する
    this.error_db[read_status.id_code] = read_status;
    // このIDカードの読み取り状況をファイル上の1行として保存する
    var yyyymmdd = read_status.firsttime.get_yyyymmdd();
    var wdayatime = read_status.firsttime.get_wdayatime();
    var hhmmss = read_status.firsttime.get_hhmmss();

    var line = [yyyymmdd, wdayatime, hhmmss, read_status.id_code].join(CONST.APP.FIELD_SEPARATOR)+"\n";
    fs.appendFileSync(this.filename_error_card, line, {encoding: CONST.ENV.ENCODING});
};


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


// 実際の読み取り処理への分岐
CardReader.prototype.on_read = function(deviceIndex, data, lecture_id){

        var match = data.match(/^([A-Za-z0-9]+)/i);
        var data = match[0];

        var card_type = data.substring(0, 2);
        var id_code = data.substring(CONST.CARDREADER.STUDENT_INFO_SUBSTRING_BEGIN,
                                     CONST.CARDREADER.STUDENT_INFO_SUBSTRING_END);
        
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
        console.log("UNDEFINED LECTURE:"+lecture_id+" in "+Object.keys(this.lecture_db.id_map).length+" definitions.");
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
        if(now.getTime() < read_status.lasttime.getTime() + 3000){
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
        if(now.getTime() < read_status.lasttime.getTime() + 3000){
            // 読み取り済み後3秒以内の場合は、何もしない
        }else{
            // すでに読み取り済みであることを警告
            // 読み取り状況オブジェクトを更新
            read_status.lasttime = now;
            // 読み取り状況オブジェクトを登録
            this.read_db.store_error_card(read_status);
            this.onReadActions.on_notice_ignorance(deviceIndex, read_status, data);
        }
    }else{
        read_status = new model.ReadStatus(data, now, now);
        this.read_db.store_error_card(read_status);
    }
};


/**
 この関数内で、FeliCaのポーリング、IDコード読み出し、処理を行う。
 この関数の呼び出しはブロックする。
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
                pafe.pasori_close();
                process.exit();
            }

            pasori.set_timeout(CONST.PASORI.TIMEOUT);

            this.onReadActions.send({
                    command:'heartBeat',
                        deviceIndex: pasoriIndex
                        });

            try{
                var felica = pasori.polling(CONST.FELICA.SYSTEM_CODE.FELICA_LITE,
                                            CONST.FELICA.POLLING_TIMESLOT);
            }catch(e){
                console.log("error_code=" + pasori.get_error_code());
                break;
            }
            
            if(! felica){
                if(DEBUG){
                    console.log("reset pasori #"+pasoriIndex);
                }
                pasori.reset();
                continue;
            }

            var data = felica.read_single(CONST.CARDREADER.SERVICE_CODE,
                                          0,
                                          CONST.CARDREADER.ID_INFO.BLOCK_NUM);
            felica.close();

            if(data){
                if(DEBUG){
                    console.log("  data "+data);
                }

                //should check PMm
                if(DEBUG){
                    console.log("PMm:"+felica.get_pmm().toHexString());
                }

                this.on_read(pasoriIndex, data, lecture_id);

            }
        }
    }
};

// ----------------------------------------------------------

// 各種Excelファイルを読み取り、データベースを初期化
var db = loader.load(CONST.APP.ETC_DIRECTORY, 
                     CONST.ENV.PATH_SEPARATOR, 
                     config.filename);

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
var onReadActions = new actions.OnReadActions(ws);

function main(lecture_id){
    var lecture = db.lectures.lecture_id_map[lecture_id];
    var teachers = [lecture.teacher, lecture.co_teacher].join(' ');
    var members = db.members[lecture_id];
    var max_members = (members) ? Object.keys(members).length : 0;
    onReadActions.onStartUp(lecture, teachers, max_members);

    // 現在の日時をもとに該当する出席確認済み学生名簿を読み取り、データベースを初期化
    var read_db = new ReadStatusDB(function(date, student){
            onReadActions.onResumeLoadingStudent(date, student);
        }, 
        function(date, student){
            onReadActions.onResumeLoadingNoMember(date, student);
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
