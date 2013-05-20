var stringUtil = require("./stringUtil.js");

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


function format02d(value){
    return stringUtil.format02d(value);
}

/**
   時刻を与えると、それが何時限目かを返す。
   @param [Date] now 時刻オブジェクト
   @param [Integer] early_margin 授業開始時間よりも何分前から出席を取るか？
   @param [Integer] late_margin 授業開始時間から何分後まで出席を取るか？
   @return [Integer] 何時限目かを表す数値(1時限目なら1), 範囲外の時間なら0を返す。
*/

module.exports.getAcademicTime = function(now){
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
};

module.exports.createDate = function (ftime){
    var time = parseIntegerArgs(ftime.split(/[\s\-\:\,]/),
                                ['year','mon','day','wday','atime','hour','min','sec']);
    return new Date(time.year, 
                    time.mon - 1, 
                    time.day, 
                    time.hour, 
                    time.min, 
                    time.sec)
};


module.exports.format_time = function(time){
    return time.getFullYear()+'-'+
    format02d(time.getMonth()+1)+'-'+
    format02d(time.getDate())+
    ','+
    WDAY[time.getDay()]+'-'+
    module.exports.getAcademicTime(time)+
    ','+
    format02d(time.getHours())+':'+
    format02d(time.getMinutes())+':'+
    format02d(time.getSeconds());
};
