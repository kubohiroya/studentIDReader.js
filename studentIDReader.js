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

/* global require */
/* jslint node: true */
"use strict";

var db = require('./lib/db.js');
var model = require('./lib/model.js');

var config = {};

config.READ_STATUS_FIELD_KEYS = ['yyyymmdd', 'wdayatime', 'hhmmss', 'id_code', 'fullname', 'furigana', 'group_id'];

/* アプリケーション固有の設定 */
config.APP = {
    HAVE_PASORI: true,
    AUTO_LAUNCH_BROWSER: true,
    CATCH_SIGINT: false,
    READ_STATUS_FILE_EXTENTION: 'csv.txt',
    READ_ERRROR_FILE_EXTENTION: 'error.csv.txt',
    VAR_DIRECTORY: 'var', //学生名簿ファイルの読み取り結果ファイルの保存先ディレクトリ
    FIELD_SEPARATOR: ',',
    ENCODING: 'UTF-8',    
    PASORI_SAME_CARD_READ_IGNORE: 3000
};

/* ネットワークの設定 */
config.NET = {
    HTTP_PORT: 8888,
    WS_PORT: 8889
};

/* システム環境の設定 */
config.ENV = {
    ENCODING: 'utf-8',
    PATH_SEPARATOR: '/'
};

config.GROUPING = true;
config.NUM_GROUPS = 6;


function loadEnrollmentFile(enrollment_filename){
    return (enrollment_filename)? db.loadEnrollmentFile(enrollment_filename,
                                                                  {
                                                                    encoding: 'Shift-JIS',
                                                                    separator: ','
                                                                  }
                                                                 ) : undefined;
}

function loadTeacherFile(teacher_filename){
    return (teacher_filename)? db.loadTeacherFile(teacher_filename,
                                                              {
                                                                  encoding: 'utf-8',
                                                                  separator: ','
                                                              },
                                                              function (entry) {
                                                                  return new model.Teacher(entry.id_code,
                                                                                           entry.fullname,
                                                                                           entry.logname);
                                                              }) : undefined;
}


(function(config){

    var FelicaReader = require('./lib/felicaReader.js').FelicaReader;
    
    var enrollment_filename;
    var teacher_filename;
    
    process.argv.slice(2).forEach(function(val, index, array){
        switch(index){
            case 0:
                enrollment_filename = val;
                break;
            case 1:
                teacher_filename = val;
                break;
        }
    });

    var enrollment_db = loadEnrollmentFile(enrollment_filename);
    var teacher_db = loadTeacherFile(teacher_filename);

    new FelicaReader(
        config, 
        teacher_db,
        (enrollment_db)? enrollment_db.lecture : undefined,
        (enrollment_db)? enrollment_db.student_db : undefined,
        loadTeacherFile,
        loadEnrollmentFile
    ).start();
    
})(config);
