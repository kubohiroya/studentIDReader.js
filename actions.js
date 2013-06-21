var MESSAGE_ATTEND = "出席";
var MESSAGE_NO_USER = '学内関係者ではありません';
var MESSAGE_NO_MEMBER = '履修者ではありません';
var MESSAGE_CONTINUOUS_READ = '出席(継続読み取り)';
var MESSAGE_ALREADY_READ = '(処理済み)';
var MESSAGE_ADMIN_CONFIG = '教員(管理)';

var DEBUG = false;

/**
   FeliCa学生証読み取り時のアクション
*/
OnReadActions = function(ws){
    this.ws = ws;
};

OnReadActions.prototype.send = function(data){
    this.ws.clients.forEach(
        function(client) {
            client.send(JSON.stringify(data));
        }
    );
};

OnReadActions.prototype.onStartUp = function(lecture, teachers, max_members){
    this.send({
            command:'onStartUp',
            classname:lecture.name,
            teacher: teachers,
            max:max_members
        });
};

/**
   教員カードを読み取れた場合
*/
OnReadActions.prototype.on_adminConfig = function(deviceIndex, read_status, teacher){

    if(DEBUG){
        console.log("ADMIN: "+read_status.lasttime.get_yyyymmdd_hhmmss());
    }

    this.send({
        command: 'onAdminConfig',
        time:read_status.lasttime.getTime(),
        teacher_id:read_status.id,
        teacher:teacher,
        result:MESSAGE_ADMIN_CONFIG,
        deviceIndex: deviceIndex
    });
    
};

/**
   学生名簿に学生データが存在し、かつ、
   学生証から学籍番号が読み取れた場合
*/
OnReadActions.prototype.on_attend = function(deviceIndex, read_status, student){
    if(DEBUG){
        console.log( read_status.lasttime.get_yyyymmdd_hhmmss());
        console.log( MESSAGE_ATTEND+" "+student.id_code+" "+student.fullname);
    }

    this.send({
        command: 'onRead',
        time:read_status.lasttime.getTime(),
        id_code:read_status.id,
        student:student,
        result:MESSAGE_ATTEND,
        deviceIndex: deviceIndex
    });
    
};

/**
   学生名簿に学生データが存在し、かつ、
   その学生証が直前の読み取りで読み取り済みの場合(何もしない)
*/
OnReadActions.prototype.on_continuous_read = function(deviceIndex, read_status, student){
    if(DEBUG){
        console.log( read_status.lasttime.get_yyyymmdd_hhmmss() +" > "+ new Date().get_yyyymmdd_hhmmss() );
        console.log( MESSAGE_CONTINUOUS_READ+" "+student.id_code+" "+student.fullname);
    }
};

/**
   学生名簿に学生データが存在し、かつ、
   その学生証が以前の読み取りで読み取り済みの場合(読み取り済み注意を表示)
*/
OnReadActions.prototype.on_notice_ignorance = function(deviceIndex, read_status, student){
    if(DEBUG){
        console.log( read_status.lasttime.get_yyyymmdd_hhmmss());
        console.log( MESSAGE_ALREADY_READ+" "+student.id_code+" "+student.fullname);
    }

    this.send({
        command: 'onRead',
        time:read_status.lasttime.getTime(),
        id_code:read_status.id,
        student:student,
        result:MESSAGE_ALREADY_READ,
        deviceIndex: deviceIndex
    });
};

/**
   学内関係者の名簿にデータが存在しない場合
*/
OnReadActions.prototype.on_error_card = function(deviceIndex, read_status){
    if(DEBUG){
        console.log( read_status.lasttime.get_yyyymmdd_hhmmss());
    }
    
    this.send({
            command: 'onRead',
            time:read_status.lasttime.getTime(),
            id_code:read_status.id,
            result: MESSAGE_NO_USER,
            deviceIndex: deviceIndex
        });
};

OnReadActions.prototype.onResumeLoadingStudent = function(date, student){
    this.send({
            command:'onResume',
            time: date.getTime(),
            id_code:student.id_code,
            student:student,
            result: MESSAGE_ATTEND
        });
};

OnReadActions.prototype.onResumeLoadingNoMember = function(date, student){
    this.send({command:'onResume',
               time: date.getTime(),
               id_code:student.id_code,
               result: MESSAGE_NO_MEMBER
        });
};


OnReadActions.prototype.on_polling = function(deviceIndex){
    this.send({
            command:'heartBeat',
            deviceIndex: deviceIndex
        });
};
