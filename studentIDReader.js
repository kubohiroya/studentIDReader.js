/*
  felica card reader to check attendee
  Copyright (c) 2013 Hiroya Kubo <hiroya@cuc.ac.jp> ,Takaaki Atsumi <b140096@cuc.ac.jp>
   
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

var fs = require('fs-extra');
var path = require('path');

var open = require('open');

var xlsx = require('xlsx');
var express = require('express');
var http = require('http');
var ws = require("websocket.io");

var ffi = require("ffi");
var ref = require('ref');
var ArrayType = require('ref-array');

HTTP_PORT = 8888;
WS_PORT = 8889;

ENCODING = 'utf-8';

const FELICA_LITE_SYSTEM_CODE = 0x88B4;
ANY_SYSTEM_CODE = 0xFFFF;
const STUDENT_INFO_SERVICE_CODE = 0x000B;
const STUDENT_INFO_BLOCK_NUM = 0x8004;

ASCII_CODE_CHAR_0 = 30;
ASCII_CODE_CHAR_9 = 39;
ASCII_CODE_CHAR_A = 65;
ASCII_CODE_CHAR_Z = 90;
ASCII_CODE_CHAR_a = 97;
ASCII_CODE_CHAR_z = 122;

// pasori格納用変数宣言
var pasori = ref.types.void;
var pasoriptr = ref.refType(pasori);

// felicaポインタ格納用変数宣言
var fe = ref.types.void;
var feptr = ref.refType(fe);

// studentID格納用変数宣言
var b = ref.types.byte;
var IntArray = ArrayType(b);
var studentID = new IntArray(16);

// dllを使えるようにする
var felicalib = ffi.Library('./felicalib.dll', {
  'pasori_open'		: [ 'pointer', 	['void'] 	],
  'pasori_init' 	: [ 'void', 	[pasoriptr] ],
  'felica_polling'	: [ 'pointer', 	[pasoriptr,'int','int','int'] ],
  'felica_read_without_encryption02':['void', [feptr,'int','int','int',IntArray] ],
  'felica_free'		: [ 'void', 	[feptr] 	]
});


//学生名簿ファイルの読み出し元・読み取り結果ファイルの保存先
FELICA_READER_VAR_DIRECTORY = 'var';
STUDENTS_MEMBER_FILENAME = 'students.csv';

FILE_EXTENTION = 'csv';
ERRROR_FILE_EXTENTION = 'error.csv';

COMMA_SEPARATOR = ",";
TAB_SEPARATOR = "\t";
SEPARATOR = COMMA_SEPARATOR;

//大学の授業の開始時間 [[時,分],[時,分]...]
ACADEMIC_TIME = [
    [0, 0],
    [9, 0],
    [10, 40],
    [13, 10],
    [14, 50],
    [16, 30],
    [18, 10]
];


//授業開始時間よりも何分前から出席を取るか？
EARLY_MARGIN = 10;
//授業開始時間から何分後まで出席を取るか？
LATE_MARGIN = 90;

WDAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/**
   時刻を与えると、それが何時限目かを返す。
   @param [Date] now 時刻オブジェクト
   @param [Integer] early_margin 授業開始時間よりも何分前から出席を取るか？
   @param [Integer] late_margin 授業開始時間から何分後まで出席を取るか？
   @return [Integer] 何時限目かを表す数値(1時限目なら1), 範囲外の時間なら0を返す。
*/

function getAcademicTime(now){
    var early_margin = EARLY_MARGIN;
    var late_margin = LATE_MARGIN;
    for(var i = 0; i < ACADEMIC_TIME.length; i++){
        var t = ACADEMIC_TIME[i];
        var now_time = now.getHours() * 60 + now.getMinutes();
        var start = t[0] * 60 + t[1];
        if(start - early_margin <= now_time &&
           now_time <= start + late_margin){
            return i;
        }
    }
    return 0;
}

/**
   16進数表記を返す
   @param [Array] ary 元データの配列
*/
function hex_dump(ary){
    var ret = '';
    for(var i = 0; i<ary.length; i++){
        ret += ary[i].toString(16);
    }
    return ret;
}

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function forEachLineSync(filename, separator, keys, callback){
    if(filename.endsWith('.csv')){
        return fs.readFileSync(filename, ENCODING).toString().split('\n').forEach(function(line){
            if(line.match(/^\#/) || line.length == 0){
                return;
            }
            var values = line.split(separator);
            var entry = {};
            for(var i = 0; i < keys.length; i++){
                entry[keys[i]] = values[i];
            }
            return callback(entry);
        });
    }else if(filename.endsWith('.xlsx')){
        var sheet = xlsx(fs.readFileSync(filename).toString());
        var rowHeader = true;
        sheet.worksheets[0].data.forEach(function(row){
            if(rowHeader == false){
                var entry = {};
                for(var i = 0; i < keys.length; i++){
                    entry[keys[i]] = row[i].value;
                }
                return callback(entry);
            }
            rowHeader = false;
        });
        
    }
}

function parseIntegerArgs(values, keys){
    var entry = {};
    for(var i = 0; i < keys.length; i++){
        var value = values[i];
        for(var j = 0; j < value.length; j++){
            if(value[j] != '0'){
                value = value.substring(j);
                break;
            }
        }
        entry[keys[i]] = parseInt(value);
    }
    return entry;
}


/**
   学生名簿のファイルを読み、学生名簿のハッシュテーブルを返す
   @param [String] filename 学生名簿ファイルのファイル名
   @return [Hash] '学籍番号'->学生 という構造のハッシュテーブル
*/
function loadStudentDB(filename){
    var student_hash = {};
    var num_students = 0;
    forEachLineSync(filename, COMMA_SEPARATOR,
                    ['student_id','fullname','furigana','gender'],
                    function(entry){
                        student_hash[entry.student_id] = new Student(entry.student_id,
                                                                    entry.fullname,
                                                                    entry.furigana,
                                                                    entry.gender);
                        console.log("read: " + 
                                    entry.student_id + " "+ 
                                    entry.fullname);
                        num_students += 1;
                    });
    console.log("finish: reaading student entry: "+num_students);
    return student_hash;
}

function createDate(ftime){
    var time = parseIntegerArgs(ftime.split(/[\s\-\:]/),
                                ['year','mon','day','wday','atime','hour','min','sec']);
    return new Date(time.year, 
                    time.mon - 1, 
                    time.day, 
                    time.hour, 
                    time.min, 
                    time.sec)
}

function format02d(value){
    if(value < 10){
        return '0'+value;
    }else{
        return ''+value;
    }
}

function getFileNameByDate(time){
    return time.getFullYear()+'-'+
        format02d(time.getMonth()+1)+'-'+
        format02d(time.getDate())+'-'+
        WDAY[time.getDay()]+'-'
        +getAcademicTime(time);

}

function format_time(time){
    return time.getFullYear()+'-'+
        format02d(time.getMonth()+1)+'-'+
        format02d(time.getDate())+'-'+
        WDAY[time.getDay()]+'-'+
        getAcademicTime(time)+' '+
        format02d(time.getHours())+':'+
        format02d(time.getMinutes())+':'+
        format02d(time.getSeconds());
}

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
   読み取り状況を表すクラス
   @param [String] student_id 学籍番号
   @param [Date] time 時刻オブジェクト
*/
var ReadStatus = function(student_id, time){
    this.student_id = student_id;
    this.time = time;
};


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

    if(path.existsSync(this.filename)){
        forEachLineSync(this.filename, SEPARATOR, 
                        ['ftime','student_id','fullname','furigana','gender'],
                        function(student){
                            var date = createDate(student.ftime);
                            attendance[student.student_id] =
                                new ReadStatus(student.student_id, date);
                            callbackOnSuccess(date, student);
                        });
    }

    if(path.existsSync(this.filename_error_card)){
        forEachLineSync(this.filename_error_card, SEPARATOR, 
                        ['ftime','student_id','error_card_serial'],
                        function(student){
                            var date = createDate(student.ftime);
                            errorcard[student.student_id] =
                                new ReadStatus(student.student_id, date);
                            callbackOnError(date, student);
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
    return FELICA_READER_VAR_DIRECTORY+'/'+out_filename+'.'+extension;
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
ReadStatusDB.prototype.store=function(read_status, student){
    //必要に応じて保存先ファイルを切り替える
    var filename = this.get_filename(FILE_EXTENTION);
    if(this.file == null || this.filename != filename){
        // 元のファイルはクローズし、新しく現時刻の時限のファイルを開く
        if(this.file){
            console.log('close:'+this.filename);
            this.file.end();
        }
        console.log('open:'+filename);
        this.filename = filename;
        this.file = fs.createWriteStream(this.filename);
        this.clear_memory();
    }
    // この学籍番号の学生の読み取り状況をメモリ上のデータベースに登録する
    this.attendance[read_status.student_id] = read_status;

    // この学籍番号の学生の読み取り状況をファイル上の1行として保存する
    var ftime = format_time(read_status.time);
    var line = [ftime, student.student_id,
                student.fullname, student.furigana, student.gender].join(SEPARATOR)+"\n";
    
    this.file.write(line, ENCODING);
};

/**
   名簿にない学生の学生証の読み取り結果を保存する
   @param [ReadStatus] read_status 読み取り状況オブジェクト
   @return 保存した「名簿にない学生の学生証」の通し番号を返す。もしその学生証がすでに保存済みのものならば、-1を返す
*/
ReadStatusDB.prototype.store_error_card=function(read_status){

    if(this.errorcard[read_status.student_id] != null){
        // すでに保存済みの「名簿にない学生の学生証」ならば-1を返して終了
        return -1;
    }

    //必要に応じて保存先ファイルを切り替える
    var filename_error_card = this.get_filename(ERRROR_FILE_EXTENTION);

    if(this.file_error_card == null || this.filename_error_card != filename_error_card){
        // 古いファイルを開いている場合にはクローズし、新しく現時刻の時限のファイルを開く
        if(this.file_error_card){
            console.log('close:'+this.filename_error_card);
            this.file_error_card.end();
        }
        console.log('open:'+filename_error_card);
        this.filename_error_card = filename_error_card;
        this.file_error_card = fs.createWriteStream(this.filename_error_card);
        this.clear_memory();
    }
    
    // この学籍番号の学生の読み取り状況をメモリ上のデータベースに登録する
    this.errorcard[read_status.student_id] = read_status;
    // この学籍番号の学生の読み取り状況をファイル上の1行として保存する
    var ftime = format_time(read_status.time);
    var line = [ftime, read_status.student_id, this.error_card_serial].join(SEPARATOR)+"\n";
    this.file_error_card.write(line, ENCODING);
    return this.increment_error_card_serial();
};


/**
   FeliCaカード読み取りクラス
*/
var CardReader = function(system_code, student_db, read_db, onReadActions){
    // カード読み出しのポーリングを実行し、無限ループに入る
    this.system_code = system_code;
    this.prev_student_id = null;
    this.student_db = student_db;
    this.read_db = read_db;
    this.onReadActions = onReadActions;

};

CardReader.prototype.on_read = function(student_id){

    // 現在時刻を取得
    var now = new Date();

    // 学生証から学籍番号が読み取れた場合
    var student = this.student_db[student_id];
    if(student){
        // 学生名簿に学生データが存在する場合
        var read_status = this.read_db.get(student_id);
        if(read_status){
            // 読み取り済みの場合
            if(this.prev_student_id == student_id){
                // 直前のループで読み取り済みの場合は、何もしない
                this.onReadActions.on_double_read(read_status, student);
            }else{
                // すでに読み取り済みであることを警告
                this.onReadActions.on_notice_ignorance(read_status, student);
            }
        }else{
            // 読み取り済みではない場合
            // 読み取り状況オブジェクトを作成
            var read_status = new ReadStatus(student_id, now);
            // 読み取り状況オブジェクトを登録
            this.read_db.store(read_status, student);
            this.onReadActions.on_success(read_status, student);
        }
    }else{
        // 学生名簿に学生データが存在しない場合
        var read_status = new ReadStatus(student_id, now);
        var error_card_serial = this.read_db.store_error_card(read_status);
        if(error_card_serial != -1){
            this.onReadActions.on_error_card(read_status, error_card_serial);
        }
    }

    // 前回に読み取ったカードの学籍番号を保存
    this.prev_student_id = student_id;
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


/**
   学生名簿に学生データが存在し、かつ、
   学生証から学籍番号が読み取れた場合
*/
OnReadActions.prototype.on_success = function(read_status, student){
    console.log( format_time(read_status.time));
    console.log( "出席 "+student.student_id+" "+student.fullname);

    this.send({
        command: 'onRead',
        time:read_status.time.getTime(),
        student_id:read_status.student_id,
        student:student,
        result:'出席'
    });
    
};

/**
   学生名簿に学生データが存在し、かつ、
   その学生証が直前の読み取りで読み取り済みの場合(何もしない)
*/

OnReadActions.prototype.on_double_read = function(read_status, student){
    console.log( format_time(read_status.time));
    console.log( "出席(継続読み取り) "+student.student_id+" "+student.fullname);
};

/**
   学生名簿に学生データが存在し、かつ、
   その学生証が以前の読み取りで読み取り済みの場合(読み取り済み注意を表示)
*/
OnReadActions.prototype.on_notice_ignorance = function(read_status, student){
    console.log( format_time(read_status.time));
    console.log( "出席(処理済み) "+student.student_id+" "+student.fullname);

    this.send({
        command: 'onRead',
        time:read_status.time.getTime(),
        student_id:read_status.student_id,
        student:student,
        result:'出席(処理済み)'
    });
};

/**
   学生名簿に学生データが存在しない場合
*/
OnReadActions.prototype.on_error_card = function(read_status, error_card_serial){
    console.log( format_time(read_status.time));
    console.log( "認証失敗！ "+read_status.student_id);

    this.send({
        command: 'onRead',
        time:read_status.time.getTime(),
        student_id:read_status.student_id,
        result:'履修者ではありません'
    });
};

/**
 この関数内で、node-ffi経由でDLLを実行して学籍番号を読み出す。
*/
CardReader.prototype.polling = function(){
	//pasoriの初期化
	var p = ref.alloc(pasoriptr);
	p = felicalib.pasori_open(null);
	if(p){
	/* とりあえずコメントアウト
	    var felica = felica_open(FELICA_LITE_SYSTEM_CODE); //felica_openを呼び出す
	    felica.set_timeout(1000); //timeoutを1秒として設定
	*/
		felicalib.pasori_init(p);
		var f = ref.alloc(feptr);
		f = felicalib.felica_polling(p,FELICA_LITE_SYSTEM_CODE,0,0);
	    var prevTime = new Date().getTime();
	    
		if(f){
		    while(true){
			    var student_id ="";
		        var nowTime = new Date().getTime();
		        felicalib.felica_read_without_encryption02(f,STUDENT_INFO_SERVICE_CODE,0,STUDENT_INFO_BLOCK_NUM,studentID);
				for(var i=2;i<9;i++) student_id+= String.fromCharCode(studentID[i]);
				felicalib.felica_free(f);
				if(student_id !=""){
		            if(student_id == null){
		                if(prevTime + 1000 <= nowTime ){//前回の読み取り失敗から1秒経過
		                    // 学生証から学籍番号が読み取れなかった場合はエラー表示
		                    this.send({
		                        command: 'onRead',
		                        time: nowTime,
		                        student_id: '--------',
		                        result:'学生証が読み取れません！'
		                    });
		                    prevTime = nowTime;
		                }
		                continue;
		            }
		            this.on_read(student_id);
		        }
		    }
		}
	}
};

CardReader.prototype.test = function(){
    var student_id = '0000000';
    this.on_read(student_id);

    var student_id = '0000001';
    this.on_read(student_id);

    var student_id = '0000002';
    this.on_read(student_id);

    var student_id = '0000003';
    this.on_read(student_id);

    var student_id = '0000003';
    this.on_read(student_id);

    var student_id = '0000002';
    this.on_read(student_id);

    var student_id = '000000X';
    this.on_read(student_id);

};
// ----------------------------------------------------------

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

                  // 読み取り結果の表示アクションを指定
                  var onReadActions = new OnReadActions(ws);

                  ws.on("connection",
                        function(socket) {
                            console.log("connected.");

                            // 学生名簿を読み取り、データベースを初期化
                            var student_db = loadStudentDB(FELICA_READER_VAR_DIRECTORY+'/'+STUDENTS_MEMBER_FILENAME);

                            ws.clients.forEach(
                                function(client) {
                                    client.send(JSON.stringify({
                                        command:'onStartUp',
                                        classname:'この授業の名称',
                                        teacher:'この教員の氏名',
                                        max:'100'
                                    }));
                                }
                            );

                            // 現在の日時をもとに該当する出席確認済み学生名簿を読み取り、データベースを初期化
                            var read_db = new ReadStatusDB(
                                function(date, student){
                                    ws.clients.forEach(
                                        function(client) {
                                            client.send(JSON.stringify({
                                                command:'onResume',
                                                time: date.getTime(),
                                                student_id:student.student_id,
                                                student:student,
                                                result: '出席'
                                            }));
                                        }
                                    );
                                }, 
                                function(date, student){
                                    ws.clients.forEach(
                                        function(client) {
                                            client.send(JSON.stringify({
                                                command:'onResume',
                                                time: date.getTime(),
                                                student_id:student.student_id,
                                                result: '履修者ではありません'
                                            }));
                                        }
                                    );
                                });

                            cardReader = new CardReader(FELICA_LITE_SYSTEM_CODE, 
                                                        student_db, read_db, onReadActions);


                            //ここを、testではなくpollingを呼び出す形に書き換えるべし。
                            //cardReader.test(); 
                            cardReader.polling();

                        });

                  open('http://localhost:'+HTTP_PORT);
              }
             );
