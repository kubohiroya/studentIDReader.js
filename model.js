/**
   1人の教員の属性を表現するクラス
   @param [String] id_code ID
   @param [String] fullname 氏名
   @param [String] logname ICCアカウント名
*/
module.exports.Teacher = function(id_code, fullname, logname){
    this.id_code = id_code;
    this.fullname = fullname;
    this.logname = logname;
};

/**
   1人の学生の属性を表現するクラス
   @param [String] id_code 学籍番号
   @param [String] fullname 氏名
   @param [String] furigana フリガナ
   @param [String] gender 性別(不明な場合はnullを指定)
*/
module.exports.Student = function(id_code, fullname, furigana, gender){
    this.id_code = id_code;
    this.fullname = fullname;
    this.furigana = furigana;
    this.gender = gender;
};

/**
   1つの開講科目・授業を表現するクラス
   @param [String] id_code 学籍番号
*/
module.exports.Lecture = function(lecture_id, 
                                  grading_name, name,
                                  teacher_id_code, teacher,
                                  co_teacher_id_code, co_teacher,
                                  wday, time){
    this.lecture_id = lecture_id;
    this.grading_name = grading_name;
    this.name = name;
    this.teacher_id_code = teacher_id_code;
    this.teacher = teacher;
    this.co_teacher_id_code = co_teacher_id_code;
    this.co_teacher = co_teacher;
    this.wday = wday;
    this.time = time;
};

/**
   読み取り状況を表すクラス
   @param [String] id_code IDコード(学籍番号または教職員ID)
   @param [Date] firsttime 初回の読み取り時刻
   @param [Date] lasttime 最後の読み取り時刻
*/
module.exports.ReadStatus = function(id_code, firsttime, lasttime){
    this.id_code = id_code;
    this.firsttime = firsttime;
    this.lasttime = lasttime;
};

return module.exports;
