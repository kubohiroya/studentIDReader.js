/**
   1人の教員の属性を表現するクラス
   @param [String] teacher_id ID
   @param [String] fullname 氏名
   @param [String] logname ICCアカウント名
*/
module.exports.Teacher = function(teacher_id, fullname, logname){
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
module.exports.Student = function(student_id, fullname, furigana, gender){
    this.student_id = student_id;
    this.fullname = fullname;
    this.furigana = furigana;
    this.gender = gender;
};

/**
   1つの開講科目・授業を表現するクラス
   @param [String] student_id 学籍番号
*/
module.exports.Lecture = function(lecture_id, 
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
   @param [Date] firsttime 初回の読み取り時刻
   @param [Date] lasttime 最後の読み取り時刻
*/
module.exports.ReadStatus = function(id, firsttime, lasttime){
    this.id = id;
    this.firsttime = firsttime;
    this.lasttime = lasttime;
};

return module.exports;
