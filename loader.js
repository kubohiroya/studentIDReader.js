require('./forEachLine.js');

var DEBUG = false;

/**
   教員名簿のファイルを読み、教員のハッシュテーブルを返す
   @param [String] filename 教員名簿ファイルのファイル名
   @return [Hash] id_code:教員 という構造のハッシュテーブル
*/
function loadTeacherDB(filename, teacherFactory){
    var teacher_map = {};
    var num_teachers = 0;
    forEachLineSync(filename, {},
                    ['id_code','fullname','logname'],
                    function(entry){
                        teacher_map[entry.id_code] = teacherFactory(entry);
                        if(DEBUG){
                            console.log("load teacher: " + 
                                        entry.id_code + " "+ 
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
function loadStudentDB(filename, studentFactory){
    var student_map = {};
    var num_students = 0;
    forEachLineSync(filename, {},
                    ['id_code','fullname','furigana','gender'],
                    function(entry){
                        student_map[entry.id_code] = studentFactory(entry);
                        if(DEBUG){
                            console.log("load student: " + 
                                        entry.id_code + " "+ 
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
function loadLectureDB(filename, lectureFactory){
    var lecture_id_map = {};
    var lecture_wdaytime_map = {};
    var id_code_map = {};
    var num_lectures = 0;
    forEachLineSync(filename, {}, 
                    ['lecture_id','grading_name','name',
                     'id_code','teacher','co_teacher_id_code','co_teacher', 'wday', 'time'],
                    function(entry){
                        var lecture = lectureFactory(entry);

                        lecture_id_map[entry.lecture_id] = lecture;

                        var wday_time_key = entry.wday+','+entry.time;
                        lecture_wdaytime_map[wday_time_key] = lecture;

                        id_code_map[entry.id_code] = lecture;
                        if(entry.co_teacher_id_code){
                            id_code_map[entry.co_teacher_id_code] = lecture;
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
            id_code_map: id_code_map};
}

/**
  授業履修者名簿のファイルを読み、履修者名簿のハッシュテーブルを返す
   @param [String] filename 履修者名簿ファイルのファイル名
   @param [String] field_separator カラムの区切り文字
   @return [Hash] '授業時間割コード':履修者の学籍番号の配列という構造のハッシュテーブル
*/
function loadMemberDB(filename, field_separator){
    var member_map = {};
    var num_lectures = 0;
    var num_members = 0;
    forEachLineSync(filename, {encoding:'UTF-8', separator:field_separator},
                    ['lecture_id','lecture_name','teacher','id_code','student_name'],
                    function(entry){
                        if(! member_map[entry.lecture_id]){
                            member_map[entry.lecture_id] = {};
                            num_lectures++;
                        }
                        member_map[entry.lecture_id][entry.id_code] = true;
                        num_members++;
                        if(DEBUG){
                            console.log("load member: " + 
                                        entry.lecture_id+'->'+entry.id_code);
                        }
                    });
    console.log("finish: loading member file: "+num_members+" members of "+num_lectures+" lectures.");
    return member_map;
}

loadDefs = function(etc_directory, path_separator, filenames, field_separator,
                    teacherFactory, studentFactory, lectureFactory){
    return {
        teachers:
        loadTeacherDB(etc_directory+path_separator+filenames.TEACHERS_FILENAME, teacherFactory),
        students:
        loadStudentDB(etc_directory+path_separator+filenames.STUDENTS_FILENAME, studentFactory),
        lectures:
        loadLectureDB(etc_directory+path_separator+filenames.LECTURES_FILENAME, lectureFactory),
        members:
        loadMemberDB(etc_directory+path_separator+filenames.MEMBERS_FILENAME, field_separator)
    };
};
