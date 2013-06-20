exports.APP = {
    HAVE_PASORI : true,
    AUTO_LAUNCH_BROWSER : true,
    CATCH_SIGINT : false,
    CHECK_ORDER_TEACHER_STUDENT: true,

    ETC_DIRECTORY : 'etc', //学生名簿ファイルの読み出し元ディレクトリ
    READ_STATUS_FILE_EXTENTION : 'csv.txt',
    READ_ERRROR_FILE_EXTENTION : 'error.csv.txt',
    VAR_DIRECTORY : 'var', //学生名簿ファイルの読み取り結果ファイルの保存先ディレクトリ
    FIELD_SEPARATOR : ','
};

exports.NET = {
    HTTP_PORT : 8888,
    WS_PORT : 8889
};


exports.ENV = {
    ENCODING : 'utf-8',
    PATH_SEPARATOR : '/',
};

exports.PASORI = {
    TIMEOUT : 500
};

exports.FELICA = {
    POLLING_TIMESLOT : 0,
    SYSTEM_CODE: {
        ANY : 0xFFFF,
        FELICA_LITE : 0x88B4
    },
    READ_DELAY: 3000
};

/* 学生証リーダーの設定 */
exports.CARDREADER = {
    SERVICE_CODE : 0x000B,
    ID_INFO:{
        BLOCK_NUM : 0x8004,
        PREFIX : '01',
        SUBSTRING_BEGIN : 2,
        SUBSTRING_END : 9
    }
};


