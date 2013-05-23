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

var HAVE_PASORI = true;
var AUTO_LAUNCH_BROWSER = true;
var CATCH_SIGINT = false;

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
var config = require('./config.js');

var pafe = new require('./node_modules/node-libpafe/build/Release/pafe').PaFe();

var MESSAGE_ATTEND = "出席";
var MESSAGE_NO_USER = '学内関係者ではありません';
var MESSAGE_NO_MEMBER = '履修者ではありません';
var MESSAGE_CONTINUOUS_READ = '出席(継続読み取り)';
var MESSAGE_ALREADY_READ = '出席(処理済み)';
var MESSAGE_ADMIN_CONFIG = '教員(管理)';

//******************//
var DEBUG = false;

var UTF8_ENCODING = 'utf-8';
var ENCODING = UTF8_ENCODING;
var PATH_SEPARATOR = '/';

var FILE_EXTENTION = 'csv.txt';
var ERRROR_FILE_EXTENTION = 'error.csv.txt';
var COMMA_SEPARATOR = ",";
var TAB_SEPARATOR = "\t";
var SEPARATOR = COMMA_SEPARATOR;

/* 学生証リーダーの設定 */

var HTTP_PORT = 8888;
var WS_PORT = 8889;

var FELICA_POLLING_TIMESLOT = 0;
var PASORI_TIMEOUT = 100;

var FELICA_ANY_SYSTEM_CODE = 0xFFFF;
var FELICA_LITE_SYSTEM_CODE = 0x88B4;
var STUDENT_INFO_SERVICE_CODE = 0x000B;
var STUDENT_INFO_BLOCK_NUM = 0x8004;
var CARD_TYPE = "01";
var STUDENT_INFO_SUBSTRING_BEGIN = 2;
var STUDENT_INFO_SUBSTRING_END = 9;

var ETC_DIRECTORY = 'etc';//学生名簿ファイルの読み出し元ディレクトリ
var VAR_DIRECTORY = 'var';//学生名簿ファイルの読み取り結果ファイルの保存先ディレクトリ

var eventLoop = true;

var lecture_id = config.args.LECTURE_ID;
  
//******************//

function LectureDB(id_map, wdaytime_map, teacher_id_map){
    this.id_map = id_map;
    this.wdaytime_map = wdaytime_map;
    this.teacher_id_map = teacher_id_map;
}

/**
   1人の教員の属性を表現するクラス
   @param [String] teacher_id ID
   @param [String] fullname 氏名
   @param [String] logname ICCアカウント名
*/
var Teacher = function(teacher_id, fullname, logname){
    this.teacher_id = teacher_id;
    this.fullname = fullname;
    this.logname = logname;
};

/**
   1人の学生の属性を表現するクラス
   @param [String] student_id 学籍番号
   @param [String] fullname 氏名
   @param [String] furigana フリガナ
   @param [String] gender 性別(不明な場合はnullを指定)
*/
var Student = function(student_id, fullname, furigana, gender){
    this.student_id = student_id;
    this.fullname = fullname;
    this.furigana = furigana;
    this.gender = gender;
};

/**
   1つの開講科目・授業を表現するクラス
   @param [String] student_id 学籍番号
*/
var Lecture = function(
                       grading_name, name,
                       teacher_id, teacher,
                       co_teacher_id, co_teacher,
                       wday, time){
    this.lecture_id = lecture_id;
    this.grading_name = grading_name;
    this.name = name;
    this.teacher_id = teacher_id;
    this.teacher = teacher;
    this.co_teacher_id = co_teacher_id;
    this.co_teacher = co_teacher;
    this.wday = wday;
    this.time = time;
};

/**
   読み取り状況を表すクラス
   @param [String] id 学籍番号または教職員ID
   @param [Date] time 時刻オブジェクト
*/
var ReadStatus = function(id, time){
    this.id = id;
    this.time = time;
};

//------------------------------------------------------------------------------
if(CATCH_SIGINT){
    process.on('SIGINT', function () {
        console.log( "\ngracefully shutting down from  SIGINT (Crtl-C)" )
        eventLoop = false;
        pafe.pasori_close();
        process.exit();
        });
}

var getFileNameByDate = function(time){
    return time.getFullYear()+'-'+
    stringUtil.format0d(time.getMonth()+1)+'-'+
    stringUtil.format0d(time.getDate())+'-'+
    time.getWday()+'-'+
    time.getAcademicTime();
};

/**
   教員名簿のファイルを読み、教員のハッシュテーブルを返す
   @param [String] filename 教員名簿ファイルのファイル名
   @return [Hash] '教員ID':教員 という構造のハッシュテーブル
*/
function loadTeacherDB(filename){
    var teacher_map = {};
    var num_teachers = 0;
    forEachLine.forEachLineSync(filename, {},
                                ['teacher_id','fullname','logname'],
                                function(entry){
                                    teacher_map[entry.teacher_id] = new Teacher(entry.teacher_id,
                                                                                entry.fullname,
                                                                                entry.logname);
                                    if(DEBUG){
                                        console.log("load teacher: " + 
                                                    entry.teacher_id + " "+ 
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
function loadStudentDB(filename){
    var student_map = {};
    var num_students = 0;
    forEachLine.forEachLineSync(filename, {},
                                ['student_id','fullname','furigana','gender'],
                                function(entry){
                                    student_map[entry.student_id] = new Student(entry.student_id,
                                                                    entry.fullname,
                                                                    entry.furigana,
                                                                    entry.gender);
                                    if(DEBUG){
                                        console.log("load student: " + 
                                                    entry.student_id + " "+ 
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
function loadLectureDB(filename){
    var lecture_id_map = {};
    var lecture_wdaytime_map = {};
    var teacher_id_map = {};
    var num_lectures = 0;
    forEachLine.forEachLineSync(filename, {}, 
                                ['lecture_id','grading_name','name',
                                 'teacher_id','teacher','co_teacher_id','co_teacher', 'wday', 'time'],
                                function(entry){
                                    var lecture = new Lecture(entry.lecture_id,
                                                              entry.grading_name,entry.name,
                                                              entry.teacher_id,entry.teacher,
                                                              entry.co_teacher_id,entry.co_teacher,
                                                              entry.wday, entry.time);

                                    lecture_id_map[entry.lecture_id] = lecture;

                                    var wday_time_key = entry.wday+','+entry.time;
                                    lecture_wdaytime_map[wday_time_key] = lecture;

                                    teacher_id_map[entry.teacher_id] = lecture;
                                    if(entry.co_teacher_id){
                                        teacher_id_map[entry.co_teacher_id] = lecture;
                                    }

                                    if(DEBUG){
                                        console.log("load lecture: " + 
                                                    entry.lecture_id + " "+ 
                                                    entry.name);
                                    }
                                    num_lectures += 1;
                                });

    console.log("finish: loading lecture file: "+num_lectures +" lectures.");

    return new LectureDB(lecture_id_map, lecture_wdaytime_map, teacher_id_map);
}

/**
  授業履修者名簿のファイルを読み、履修者名簿のハッシュテーブルを返す
   @param [String] filename 履修者名簿ファイルのファイル名
   @return [Hash] '授業時間割コード':履修者の学籍番号の配列という構造のハッシュテーブル
*/
function loadMemberDB(filename){
    var member_map = {};
    var num_lectures = 0;
    var num_members = 0;
    forEachLine.forEachLineSync(filename, {encoding:'UTF-8',separator:TAB_SEPARATOR},
                    ['lecture_id','lecture_name','teacher','student_id','student_name'],
                    function(entry){
                        if(! member_map[entry.lecture_id]){
                            member_map[entry.lecture_id] = [];
                            num_lectures++;
                        }
                        member_map[entry.lecture_id].push(entry.student_id);
                        num_members++;
                        if(DEBUG){
                            console.log("load member: " + 
                                        entry.lecture_id+'->'+entry.student_id);
                        }
                    });
    console.log("finish: loading member file: "+num_members+" members of "+num_lectures+" lectures.");
    return member_map;
}


/**
   学生証の読み取り結果を、ファイルとメモリ上のハッシュテーブルの両方に対して、
   同期した形で保存していくような動作をするデータベースを表すクラス
*/
var ReadStatusDB = function(callbackOnSuccess, callbackOnError){
    this.error_card_serial = 0;
    this.attendance = {};
    var attendance = this.attendance;
    this.errorcard = {};
    var errorcard = this.errorcard;

    this.filename = this.get_filename(FILE_EXTENTION);
    this.filename_error_card = this.get_filename(ERRROR_FILE_EXTENTION);

    if(fs.existsSync(this.filename)){
        forEachLine.forEachLineSync(this.filename, {
                encoding: ENCODING, 
                    separator: COMMA_SEPARATOR
                    },
            ['yyyymmdd','wdayatime','hhmmss','student_id','fullname','furigana'],
            function(entry){

                var yyyymmddhhmmss = (entry.yyyymmdd+" "+entry.hhmmss);
                var date = yyyymmddhhmmss.split(/[\s\-\:\,]/).createDateAs(['year','mon','day','hour','min','sec'] );
                attendance[entry.student_id] = new ReadStatus(entry.student_id, date);
                callbackOnSuccess(date, entry);
            });
    }

    if(fs.existsSync(this.filename_error_card)){
        forEachLine.forEachLineSync(this.filename_error_card, {
                encoding: ENCODING, 
                separator: COMMA_SEPARATOR
            },
            ['yyyymmdd','wdayatime','hhmmss','id','error_card_serial'],
            function(entry){
                var yyyymmddhhmmss = (entry.yyyymmdd+" "+entry.hhmmss);
                var date = yyyymmddhhmmss.split(/[\s\-\:\,]/).createDateAs(['year','mon','day','hour','min','sec'] );
                errorcard[entry.id] = new ReadStatus(entry.id, date);
                new ReadStatus(entry.id, date);
                callbackOnError(date, entry);
            });
    }
};

/**
   メモリ上のデータベースを初期化する
*/
ReadStatusDB.prototype.clear_memory=function(){
    this.attendance = {};
    this.errorcard = {};
    this.error_card_serial = 0;
};

/**
   学生名簿に存在しない学生の学生証を管理するための通し番号として、このメソッドを呼ぶたびに新しいものを返す
   @return [Integer] 学生名簿に存在しない学生の学生証を管理するための通し番号として、新しいものを返す
*/

ReadStatusDB.prototype.increment_error_card_serial=function(){
    return this.error_card_serial += 1;
};

/*
  学生証の読み取り結果を保存してある/これから保存するための、ファイル名を返す。
  @param [String] extension ファイル名の拡張子として指定したい文字列
  @return [String] ファイル名として使われる、現時刻の「年-月-日-曜日-時限」の文字列に、拡張子を加えた文字列を返す。
*/
ReadStatusDB.prototype.get_filename=function(extension){
    var now = new Date();
    var out_filename = getFileNameByDate(now);
    return VAR_DIRECTORY+PATH_SEPARATOR+out_filename+'.'+extension;
};

/**
   その学生証が、現在の時限において読み取り済みかどうかを返す
   @param [String] student_id 学籍番号
   @return [Boolean] その学生証が、現在の時限において読み取り済みかどうか
*/
ReadStatusDB.prototype.exists=function(student_id){
    return this.attendance[student_id] != null;
};

/**
   その学籍番号を与えると、その学生の読み取り状況を表すオブジェクトを返す
   @param [String] student_id 学籍番号
   @return [ReadStatus] 読み取り済みに場合には、読み取り状況を表すオブジェクト。まだ読み取っていない場合にはnull。
*/
ReadStatusDB.prototype.get=function(student_id){
    return this.attendance[student_id];
};

/**
   学生証の読み取り結果をデータベースに保存する
   @param [ReadStatus] read_status　読み取り状況を表すオブジェクト
   @param [Student] student 学生オブジェクト
*/
ReadStatusDB.prototype.store = function(read_status, student){
    //必要に応じて保存先ファイルを切り替える
    var filename = this.get_filename(FILE_EXTENTION);
    if(this.filename != filename){
        // 元のファイルはクローズし、新しく現時刻の時限のファイルを開く
        console.log('open:'+filename);
        this.filename = filename;
        this.clear_memory();
    }
    // この学籍番号の学生の読み取り状況をメモリ上のデータベースに登録する
    this.attendance[read_status.id] = read_status;

    // この学籍番号の学生の読み取り状況をファイル上の1行として保存する
    var yyyymmdd = read_status.time.get_yyyymmdd();
    var wdayatime = read_status.time.get_wdayatime();
    var hhmmss = read_status.time.get_hhmmss();

    var line = [yyyymmdd, wdayatime, hhmmss, student.student_id,
                student.fullname, student.furigana, student.gender].join(SEPARATOR)+"\n";
    
    fs.appendFileSync(this.filename, line, {encoding: ENCODING});
    console.log(student.student_id);
};

/**
   名簿にない学生の学生証の読み取り結果を保存する
   @param [ReadStatus] read_status 読み取り状況オブジェクト
   @return 保存した「名簿にない学生の学生証」の通し番号を返す。もしその学生証がすでに保存済みのものならば、-1を返す
*/
ReadStatusDB.prototype.store_error_card = function(read_status){

    if(this.errorcard[read_status.id] != null){
        // すでに保存済みの「名簿にない学生の学生証」ならば-1を返して終了
        return -1;
    }

    //必要に応じて保存先ファイルを切り替える
    var filename_error_card = this.get_filename(ERRROR_FILE_EXTENTION);

    if(this.filename_error_card != filename_error_card){
        console.log('open:'+filename_error_card);
        this.filename_error_card = filename_error_card;
        this.clear_memory();
    }
    
    // この学籍番号の学生の読み取り状況をメモリ上のデータベースに登録する
    this.errorcard[read_status.id] = read_status;
    // この学籍番号の学生の読み取り状況をファイル上の1行として保存する
    var yyyymmdd = univUtil.format_yyyymmdd(read_status.time);
    var wdayatime = univUtil.format_wdayatime(read_status.time);
    var hhmmss = univUtil.format_hhmmss(read_status.time);

    var line = [yyyymmdd, wdaytime, hhmmss, read_status.id, this.error_card_serial].join(SEPARATOR)+"\n";
    fs.appendFileSync(this.filename_error_card, line, {encoding: ENCODING});
    return this.increment_error_card_serial();
};


/**
   FeliCaカード読み取りクラス
*/
var CardReader = function(system_code, teacher_db, student_db, lecture_db, member_db,
                          read_db, onReadActions){
    this.system_code = system_code;
    this.teacher_db = teacher_db;
    this.student_db = student_db;
    this.lecture_db = lecture_db;
    this.member_db = member_db;
    this.read_db = read_db;
    this.onReadActions = onReadActions;

    this.prev_read_user_id = null;
};


// 実際の読み取り処理への分岐
CardReader.prototype.on_read = function(data, lecture_id){

        var match = data.match(/^([A-Za-z0-9]+)/i);
        var data = match[0];

        var card_type = data.substring(0, 2);
        var user_id = data.substring(STUDENT_INFO_SUBSTRING_BEGIN,
                                     STUDENT_INFO_SUBSTRING_END);
        
        //should check PMm or something
        console.log("PMm:"+pafe.felica_get_pmm().toHexString());

        if(this.on_read_student_card(user_id, lecture_id)){
            console.log("STUDENT");
            this.prev_read_user_id = user_id;
            return;
        }else if(this.on_read_teacher_card(user_id, lecture_id)){
            console.log("TEACHER");
            this.prev_read_user_id = user_id;
            return;
        }

        this.prev_read_user_id = user_id;

        this.on_read_error(user_id);
};

CardReader.prototype.on_read_teacher_card = function(user_id, lecture_id){

    if(user_id.length != 6){
        return false;
    }

    var teacher = this.teacher_db[user_id];

    if(! teacher){
        // IDから教職員を特定できなかった場合
        console.log("UNDEFINED TEACHER:"+user_id+" in "+(this.teacher_db.length)+" definitions.");
        return false;
    }

    // 現在時刻を取得
    var now = new Date();
    var teacher_id = user_id;
    var read_status = new ReadStatus(teacher_id, now);

    this.onReadActions.on_adminConfig(read_status, teacher);

    return true;
}

    CardReader.prototype.on_read_student_card = function(user_id, lecture_id){
    var student_id = user_id;
    var student = this.student_db[student_id];

    if(! student){
        // 学籍番号から学生を特定できなかった場合
        console.log("UNDEFINED MEMBER:"+user_id+" in "+(Object.keys(this.student_db).length)+" definitions.");
        return false;
    }

    if(! this.lecture_db.id_map[lecture_id]){
        // 現在の出欠確認対象科目を設定できなかった場合
        console.log("UNDEFINED LECTURE:"+lecture_id+" in "+Object.keys(this.lecture_db.id_map).length+" definitions.");
        return false;
    }

    if(! this.member_db[lecture_id]){
        // 現在の出欠確認対象科目の履修者を設定できなかった場合
        console.log("NO MEMBER LECTURE:"+lecture_id+" in "+Object.keys(this.member_db).length+" definitions.");
        return false;
    }

    if(! this.member_db[lecture_id][student_id]){
        // その学生が現在の出欠確認対象科目の履修者ではない場合
        console.log("INVALID ATTENDEE :"+student_id+" of "+lecture_id+"("+Object.keys(this.member_db[lecture_id]).length+" members)");
        //return false;
    }

    var read_status = this.read_db.get(student_id);
    if(read_status){
        // 読み取り済みの場合
        if(this.prev_read_user_id == student_id){
            // 直前のループで読み取り済みの場合は、何もしない
            this.onReadActions.on_continuous_read(read_status, student);
        }else{
            // すでに読み取り済みであることを警告
            this.onReadActions.on_notice_ignorance(read_status, student);
        }
    }else{
        // 読み取り済みではなかった＝新規の読み取りの場合
        // 読み取り状況オブジェクトを作成
        var now = new Date();
        var read_status = new ReadStatus(student_id, now);
        // 読み取り状況オブジェクトを登録
        this.read_db.store(read_status, student);
        this.onReadActions.on_attend(read_status, student);
    }

    return true;
};

CardReader.prototype.on_read_error = function(data, lecture_id){
    // 学生名簿または教員名簿上にIDが存在しない場合
    var now = new Date();
    var read_status = new ReadStatus(data, now);
    var error_card_serial = this.read_db.store_error_card(read_status);
    if(error_card_serial != -1){
        this.onReadActions.on_error_card(read_status, error_card_serial);
    }
};


/**
   FeliCa学生証読み取り時のアクション
*/
var OnReadActions = function(ws){
    this.ws = ws;
};

OnReadActions.prototype.send = function(data){
    this.ws.clients.forEach(
        function(client) {
            client.send(JSON.stringify(data));
        }
    );
};

var format_time = function(time){
    return time.get_yyyymmdd(time);
};

/**
   教員カードを読み取れた場合
*/
OnReadActions.prototype.on_adminConfig = function(read_status, teacher){

    console.log( read_status.time.get_yyyymmdd_hhmmss());
    //console.log( MESSAGE_ADMIN_CONFIG+" "+teacher.teacher_id+" "+teacher.fullname);

    this.send({
        command: 'onAdminConfig',
        time:read_status.time.getTime(),
        teacher_id:read_status.id,
        teacher:teacher,
        result:MESSAGE_ADMIN_CONFIG
    });
    
};

/**
   学生名簿に学生データが存在し、かつ、
   学生証から学籍番号が読み取れた場合
*/
OnReadActions.prototype.on_attend = function(read_status, student){
    console.log( read_status.time.get_yyyymmdd_hhmmss());
    console.log( MESSAGE_ATTEND+" "+student.student_id+" "+student.fullname);

    this.send({
        command: 'onRead',
        time:read_status.time.getTime(),
        student_id:read_status.id,
        student:student,
        result:MESSAGE_ATTEND
    });
    
};

/**
   学生名簿に学生データが存在し、かつ、
   その学生証が直前の読み取りで読み取り済みの場合(何もしない)
*/
OnReadActions.prototype.on_continuous_read = function(read_status, student){
    console.log( read_status.time.get_yyyymmdd_hhmmss() +" > "+ new Date().get_yyyymmdd_hhmmss() );
    console.log( MESSAGE_CONTINUOUS_READ+" "+student.student_id+" "+student.fullname);
};

/**
   学生名簿に学生データが存在し、かつ、
   その学生証が以前の読み取りで読み取り済みの場合(読み取り済み注意を表示)
*/
OnReadActions.prototype.on_notice_ignorance = function(read_status, student){
    console.log( read_status.time.get_yyyymmdd_hhmmss());
    console.log( MESSAGE_ALREADY_READ+" "+student.student_id+" "+student.fullname);
    this.send({
        command: 'onRead',
        time:read_status.time.getTime(),
        student_id:read_status.id,
        student:student,
        result:MESSAGE_ALREADY_READ
    });
};

/**
   学内関係者の名簿にデータが存在しない場合
*/
OnReadActions.prototype.on_error_card = function(read_status, error_card_serial){
    console.log( read_status.time.get_yyyymmdd_hhmmss());
    this.send({
        command: 'onRead',
        time:read_status.time.getTime(),
        student_id:read_status.id,
        result: MESSAGE_NO_USER
    });
};

/**
 この関数内で、FeliCaのポーリング、教員ID・学籍番号読み出し、処理を行う。
 この関数の呼び出しは永遠にブロックする。
*/
CardReader.prototype.polling = function(pafe){

    if(! HAVE_PASORI){
        throw "ERROR: HAVE_PASORI == false";
    }

    var polling_count = 0;

    while(eventLoop){
        
        if(DEBUG){
            console.log("polling");
        }

        var ret = pafe.felica_polling(FELICA_LITE_SYSTEM_CODE, FELICA_POLLING_TIMESLOT);

        if(ret == false){

            polling_count++;
            if(1 < polling_count){
                console.log("reset");
                polling_count = 0;
                pafe.pasori_reset();
            }

            continue;
        }

        if(DEBUG){
            console.log("read_single");
        }

        var data = pafe.felica_read_single(STUDENT_INFO_SERVICE_CODE,
                                     0,
                                     STUDENT_INFO_BLOCK_NUM);
        if(DEBUG){
            console.log("data "+data);
        }

        if(DEBUG){
            console.log("felica_close");
        }


        pafe.felica_close();

        if(! data){
            continue;
        }

        if(DEBUG){
            console.log("on_read");
        }

        this.on_read(data, lecture_id);
    }

    console.log("EXIT");
};

// ----------------------------------------------------------

// 各種Excelファイルを読み取り、データベースを初期化
var teacher_db = loadTeacherDB(ETC_DIRECTORY+PATH_SEPARATOR+config.filename.TEACHERS_FILENAME);
var student_db = loadStudentDB(ETC_DIRECTORY+PATH_SEPARATOR+config.filename.STUDENTS_FILENAME);
var lecture_db = loadLectureDB(ETC_DIRECTORY+PATH_SEPARATOR+config.filename.LECTURES_FILENAME);
var member_db = loadMemberDB(ETC_DIRECTORY+PATH_SEPARATOR+config.filename.MEMBERS_FILENAME);

// WebServerを起動
var app = express();
app.configure(function(){
    app.use(express.static(__dirname+"/views"));
});

var server = http.createServer(app);
server.listen(HTTP_PORT);

var ws =
    ws.listen(WS_PORT,
              function () {

                  if(AUTO_LAUNCH_BROWSER){
                      open('http://localhost:'+HTTP_PORT);
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
    ws.clients.forEach(function(client) {
            var lecture = lecture_db.id_map[lecture_id];
            var teachers = [lecture.teacher, lecture.co_teacher].join(' ');
            var max_members = (member_db[lecture_id]) ? member_db[lecture_id].length : 0;
            client.send(JSON.stringify({
                        command:'onStartUp',
                            classname:lecture.name,
                            teacher: teachers,
                            max:max_members
                            }));
        }
        );

    // 現在の日時をもとに該当する出席確認済み学生名簿を読み取り、データベースを初期化
    var read_db = new ReadStatusDB(function(date, student){
            ws.clients.forEach(function(client) {
                    client.send(JSON.stringify({
                                command:'onResume',
                                time: date.getTime(),
                                student_id:student.student_id,
                                student:student,
                                result: MESSAGE_ATTEND
                            }));
                }
                );
        }, 
        function(date, student){
            ws.clients.forEach(function(client) {
                    client.send(JSON.stringify({
                                command:'onResume',
                                time: date.getTime(),
                                student_id:student.student_id,
                                result: MESSAGE_NO_MEMBER
                            }));
                }
                );
        });

    cardReader = new CardReader(FELICA_LITE_SYSTEM_CODE, 
                                teacher_db, student_db, lecture_db, member_db,
                                read_db, onReadActions);

    if(HAVE_PASORI){
        pafe.pasori_open();
        pafe.pasori_set_timeout(PASORI_TIMEOUT);
    }

    cardReader.polling(pafe);//この関数の呼び出しはSIGINTを受け取るまでブロックする

}

if(! AUTO_LAUNCH_BROWSER){
    main(lecture_id);
}
