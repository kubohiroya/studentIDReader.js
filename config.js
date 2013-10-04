module.exports.FILENAMES = {
    'TEACHERS_FILENAME' : '0_2013春教員アカウント情報.xlsx'
    , 'STUDENTS_FILENAME' : '1_2013春在籍者一覧.xlsx'
    //, 'LECTURES_FILENAME' : '2_2013春時間割情報.xlsx'
    , 'LECTURES_FILENAME' : '2_2013秋時間割情報.xlsx'
    //    , 'MEMBERS_FILENAME' : '3_2013春履修者一覧.csv'
    , 'MEMBERS_FILENAME' : '3_2013秋暫定履修者.csv'
};

//2013春学期
//module.exports.LECTURE_ID = '31001';//情報基礎
//module.exports.LECTURE_ID = '34002';//概論IV
//module.exports.LECTURE_ID = '34232';//ゼミ

//2013秋学期
module.exports.LECTURE_ID = '34502';//概論IV
module.exports.DUMMY_ID = '00'+'000727';
module.exports.READ_STATUS_FIELD_KEYS = 
    ['yyyymmdd','wdayatime','hhmmss','id_code','fullname','furigana', 'group_id'];
