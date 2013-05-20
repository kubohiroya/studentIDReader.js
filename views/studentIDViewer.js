WDAY = ['日','月','火','水','木','金','土'];

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

function getAcademicTime(now){
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
}

function format02d(value){
    if(value < 10){
        return '0'+value;
    }else{
        return ''+value;
    }
}

function format_time(time){
    var atime = getAcademicTime(time);
    if(atime != 0){
        return [time.getFullYear()+'年 '+
                format02d(time.getMonth()+1)+'月 '+
                format02d(time.getDate())+'日 '+
                WDAY[time.getDay()]+'曜日 '+
                atime+'限',
                format02d(time.getHours())+':'+
                format02d(time.getMinutes())+':'+
                format02d(time.getSeconds())];
    }else{
        return [time.getFullYear()+'年 '+
                format02d(time.getMonth()+1)+'月 '+
                format02d(time.getDate())+'日 '+
                WDAY[time.getDay()]+'曜日',
                format02d(time.getHours())+':'+
                format02d(time.getMinutes())+':'+
                format02d(time.getSeconds())];
    }
}

var AttendeeList = function(){
    this.nodeIndex = 0;
    this.numAttendance = 0;
};

AttendeeList.prototype.onStartUp = function(data){
    $('#console').find('span.classname').text(data.classname).end()
    .find('span.teacher').text(data.teacher).end()
    .find('span.max').text(data.max).end();
};

var playAudio = function(audio){
    if(!audio.ended || 0 < audio.currentTime){
        audio.pause();
        audio.currentTime = 0;
    }
    okSound.play();
};

AttendeeList.prototype.onUpdate = function(data, sound){
    if(data.result == '出席'){
        this.numAttendance++;
        $('#attendanceInfo span.current').text(this.numAttendance);
        if(sound == true){
            playAudio(okSound);
        }
    }else{
        if(sound == true){
            playAudio(ngSound);
        }
    }

    var id = 'node'+(this.nodeIndex++);
    $('#attendanceList').append(this._createSkelton(id));
    var node = $('#'+id);
    this._setValues(node, data);
    node.show(10);
    $('body,html').animate({scrollTop: node.offset().top}, 200);
};

AttendeeList.prototype._createSkelton = function(id){
    return "<article id='"+id+"' style='block:none' class='item'>"+
        "<div class='datetime'><span class='date'/> <span class='time'/></div>"+
        "<div class='student_id'></div>"+
        "<div class='furigana'></div>"+
        "<div class='fullname'></div>"+
        "<div class='result'></div>"+
        "</article>";
};

AttendeeList.prototype._setValues = function(node, data){
    var time = new Date();
    time.setTime(parseInt(data.time));
    var datetime = format_time(time);
    node.find('span.date').text(datetime[0]).end()
        .find('span.time').text(datetime[1]).end()
        .find('div.result').text(data.result).end()
        .find('div.student_id').text(data.student_id).end();
    if(data.student){
        node.find('div.fullname').text(data.student.fullname).end()
            .find('div.furigana').text(data.student.furigana).end();
     }else{
         node.find('div.fullname').text('').end()
             .find('div.furigana').text('').end();
     }
};


var socket = new WebSocket('ws://localhost:8889/');
var okSound = new Audio("sounds/tm2_chime002.wav");
var ngSound = new Audio("sounds/tm2_quiz003bad.wav");
var attendeeList = new AttendeeList();

function updateTimer(){
    datetime = format_time(new Date());
    $('#date').text(datetime[0]);
    $('#time').text(datetime[1]);
    setTimeout('updateTimer()', 1000);
}

function show(){
}

socket.onopen = function(){
    console.log('connected.');
};

socket.onclose = function(){
    console.log('disconnected.');
};

$(window).unload(function(){
    socket.onclose();
});

socket.onmessage = function(message){
    var data = JSON.parse(message.data);
    if(data.command == 'onStartUp'){
        attendeeList.onStartUp(data);
    }else if(data.command == 'onResume'){
        attendeeList.onUpdate(data, false);
    }else if(data.command == 'onRead'){
        attendeeList.onUpdate(data, true);
    }
};

updateTimer();
