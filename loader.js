var forEachLine = require('./forEachLine.js');
var model = require('./model.js');
var DEBUG = false;
var TAB_SEPARATOR = '\t';

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
                                    teacher_map[entry.teacher_id] = new model.Teacher(entry.teacher_id,
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
                                    student_map[entry.student_id] = new model.Student(entry.student_id,
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
                                    var lecture = new model.Lecture(entry.lecture_id,
                                                                    entry.grading_name,
                                                                    entry.name,
                                                                    entry.teacher_id,
                                                                    entry.teacher,
                                                                    entry.co_teacher_id,
                                                                    entry.co_teacher,
                                                                    entry.wday, 
                                                                    entry.time);

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

    return {lecture_id_map:lecture_id_map, 
            wdaytime_map: lecture_wdaytime_map, 
            teacher_id_map: teacher_id_map};
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
                            member_map[entry.lecture_id] = {};
                            num_lectures++;
                        }
                        member_map[entry.lecture_id][entry.student_id] = true;
                        num_members++;
                        if(DEBUG){
                            console.log("load member: " + 
                                        entry.lecture_id+'->'+entry.student_id);
                        }
                    });
    console.log("finish: loading member file: "+num_members+" members of "+num_lectures+" lectures.");
    return member_map;
}

module.exports.load = function(ETC_DIRECTORY, PATH_SEPARATOR, filename){
    return {
        teachers:
            loadTeacherDB(ETC_DIRECTORY+PATH_SEPARATOR+filename.TEACHERS_FILENAME),
        students:
            loadStudentDB(ETC_DIRECTORY+PATH_SEPARATOR+filename.STUDENTS_FILENAME),
        lectures:
            loadLectureDB(ETC_DIRECTORY+PATH_SEPARATOR+filename.LECTURES_FILENAME),
        members:
            loadMemberDB(ETC_DIRECTORY+PATH_SEPARATOR+filename.MEMBERS_FILENAME)
    };
};

return module.exports;