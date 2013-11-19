var Iconv  = require('iconv').Iconv;
var fs = require('fs');

var ObjectUtil = require('../lib/util/objectUtil.js').ObjectUtil;

var forEachLineSync = require('../lib/forEachLine.js').forEachLineSync;


var utf8toutf16 = new Iconv("UTF-8", "UTF-16");

/**
   IDカードの読み取り結果を、ファイルとメモリ上のハッシュテーブルの両方に対して、
   同期した形で保存していくような動作をするデータベースを表すクラス
*/

exports.ReadStatusDB = function(config, field_keys, readStatusFactory, callbackOnSuccess, callbackOnError){
    this.config = config;
    this.field_keys = field_keys;

    this.attendance_db = {};
    var attendance_db = this.attendance_db;
    this.error_db = {};
    var error_db = this.error_db;

    this.filename = this.get_filename(this.config.APP.READ_STATUS_FILE_EXTENTION);
    this.filename_error_card = this.get_filename(this.config.APP.READ_ERRROR_FILE_EXTENTION);

    if(fs.existsSync(this.filename)){
        forEachLineSync(this.filename, {
                encoding: 'UTF-8', 
                    separator: this.config.APP.FIELD_SEPARATOR
                    },
            field_keys,
            function(entry){
                var yyyymmddhhmmss = (entry.yyyymmdd+" "+entry.hhmmss);
                var date = yyyymmddhhmmss.split(/[\s\-\:\,]/).createDateAs(['year','mon','day','hour','min','sec'] );
                attendance_db[entry.id_code] = readStatusFactory(entry.id_code, date, date, entry);
                if(callbackOnSuccess){
                    callbackOnSuccess(date, entry);
                }
            });
    }

    if(fs.existsSync(this.filename_error_card)){
        forEachLineSync(this.filename_error_card, {
                encoding: 'UTF-8', 
                separator: this.config.APP.FIELD_SEPARATOR
            },
            field_keys,
            function(entry){
                var yyyymmddhhmmss = (entry.yyyymmdd+" "+entry.hhmmss);
                var date = yyyymmddhhmmss.split(/[\s\-\:\,]/).createDateAs(['year','mon','day','hour','min','sec'] );
                error_db[entry.id_code] = readStatusFactory(entry.id_code, date, date, entry);
                if(callbackOnError){
                    callbackOnError(date, entry);
                }
            });
    }
};

/**
   メモリ上のデータベースを初期化する
*/
exports.ReadStatusDB.prototype.clear_memory=function(){
    this.attendance_db = {};
    this.error_db = {};
};

/*
  学生証の読み取り結果を保存してある/これから保存するための、ファイル名を返す。
  @param [String] extension ファイル名の拡張子として指定したい文字列
  @return [String] ファイル名として使われる、現時刻の「年-月-日-曜日-時限」の文字列に、拡張子を加えた文字列を返す。
*/
exports.ReadStatusDB.prototype.get_filename=function(extension){
    var now = new Date();
    return this.config.APP.VAR_DIRECTORY + 
    this.config.ENV.PATH_SEPARATOR + now.get_yyyy_mm_dd_w_y()+'.'+extension;
};

/**
   その学生証が、現在の時限において読み取り済みかどうかを返す
   @param [String] id_code IDコード
   @return [Boolean] その学生証が、現在の時限において読み取り済みかどうか
*/
exports.ReadStatusDB.prototype.exists=function(id_code){
    return this.attendance_db[id_code] != null;
};

/**
   IDコードを与えると、その学生の読み取り状況を表すオブジェクトを返す
   @param [String] id_code IDコード
   @return [ReadStatus] 読み取り済みに場合には、読み取り状況を表すオブジェクト。まだ読み取っていない場合にはnull。
*/
exports.ReadStatusDB.prototype.get=function(id_code){
    return this.attendance_db[id_code];
};

/**
   IDコードを与えると、その学生の読み取り状況を表すオブジェクトを返す
   @param [String] id_code IDコード
   @return [ReadStatus] 読み取り済みに場合には、読み取り状況を表すオブジェクト。まだ読み取っていない場合にはnull。
*/
exports.ReadStatusDB.prototype.get_error=function(id){
    return this.error_db[id];
};

/**
   学生証の読み取り結果をデータベースに保存する
   @param [ReadStatus] read_status　読み取り状況を表すオブジェクト
   @param [Student] student 学生オブジェクト
*/
exports.ReadStatusDB.prototype.store = function(read_status, student){
    //必要に応じて保存先ファイルを切り替える
    var filename = this.get_filename(this.config.APP.READ_STATUS_FILE_EXTENTION);
    if(this.filename != filename){
        // 元のファイルはクローズし、新しく現時刻の時限のファイルを開く
        console.log('open:'+filename);
        this.filename = filename;
        this.clear_memory();
    }
    // このIDコードの学生の読み取り状況をメモリ上のデータベースに登録する

    var isNewEntry = false;

    if(! this.attendance_db[read_status.id_code]){
        isNewEntry = true;
    }

    this.attendance_db[read_status.id_code] = read_status;

    if(! isNewEntry){
        return;
    }

    student.yyyymmdd = read_status.lasttime.get_yyyymmdd();
    student.wdayatime = read_status.lasttime.get_wdayatime();
    student.hhmmss = read_status.lasttime.get_hhmmss();

    console.log("store:"+student.id_code);
    
        console.log("student:"+JSON.stringify(student));

    // このIDコードの学生の読み取り状況をファイル上の1行として保存する
    var line = ObjectUtil.values(student, this.field_keys).join(this.config.APP.FIELD_SEPARATOR)+"\n";
    fs.appendFileSync(this.filename, line);
    //fs.appendFileSync(this.filename, utf8toutf16.convert(line));

};

/**
   名簿にない学生の学生証の読み取り結果を保存する
   @param [ReadStatus] read_status 読み取り状況オブジェクト
*/
exports.ReadStatusDB.prototype.store_error_card = function(read_status){

    if(this.error_db[read_status.id_code] != null){
        // すでに保存済みの「名簿にないIDカード」ならば-1を返して終了
        return -1;
    }

    //必要に応じて保存先ファイルを切り替える
    var filename_error_card = this.get_filename(this.config.APP.READ_ERRROR_FILE_EXTENTION);

    if(this.filename_error_card != filename_error_card){
        console.log('open:'+filename_error_card);
        this.filename_error_card = filename_error_card;
        this.clear_memory();
    }
    
    // このIDカードの読み取り状況をメモリ上のデータベースに登録する
    this.error_db[read_status.id_code] = read_status;
    // このIDカードの読み取り状況をファイル上の1行として保存する

    //var keys = ['yyyymmdd', 'wdayatime', 'hhmmss', 'id_code'];
    var entry = {
        yyyymmdd : read_status.lasttime.get_yyyymmdd(),
        wdayatime : read_status.lasttime.get_wdayatime(),
        hhmmss : read_status.lasttime.get_hhmmss(),
        id_code : read_status.id_code
    };

    var line = ObjectUtil.values(entry, this.field_keys).join(this.config.APP.FIELD_SEPARATOR)+"\n";
    //fs.appendFileSync(this.filename_error_card, utf8toutf16.convert(line));
    fs.appendFileSync(this.filename_error_card, line);
};


