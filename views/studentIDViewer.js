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

function getFileNameByDate(time){
    return time.getFullYear()+'-'+
        format02d(time.getMonth()+1)+'-'+
        format02d(time.getDate())+'-'+
        WDAY[time.getDay()]+'-'
        +getAcademicTime(time);
}

function format_time(time){
    return [time.getFullYear()+'年 '+
            format02d(time.getMonth()+1)+'月 '+
            format02d(time.getDate())+'日 '+
            WDAY[time.getDay()]+'曜日 '+
            getAcademicTime(time)+'限',
            format02d(time.getHours())+':'+
            format02d(time.getMinutes())+':'+
            format02d(time.getSeconds())];
}

function createSkelton(id){
    return "<article id='"+id+"' style='block:none' class='item'>"+
        "<div class='datetime'><span class='date'/> <span class='time'/></div>"+
        "<div class='student_id'></div>"+
        "<div class='furigana'></div>"+
        "<div class='fullname'></div>"+
        "<div class='result'></div>"+
        "</article>";
}

function setValues(node, data){
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
}

var socket = new WebSocket('ws://localhost:8889/');

var okSound = new Audio("sounds/tm2_chime002.wav");
var ngSound = new Audio("sounds/tm2_quiz003bad.wav");

function updateTimer(){
    datetime = format_time(new Date());
    $('#date').text(datetime[0]);
    $('#time').text(datetime[1]);
    setTimeout('updateTimer()', 1000);
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

var nodeIndex = 0;
var numAttendance = 0;

updateTimer();

socket.onmessage = function(message){
    var data = JSON.parse(message.data);

    if(data.command == 'onStartUp'){
        $('#console').find('span.classname').text(data.classname).end()
            .find('span.teacher').text(data.teacher).end()
            .find('span.max').text(data.max).end()

    }else if(data.command == 'onRead'){
        if(data.result == '出席'){
            numAttendance++;
            $('#attendanceInfo span.current').text(numAttendance);
            okSound.play();
        }else{
            ngSound.play();
        }

        var id = 'node'+(nodeIndex++);
        $('#attendanceList').append(createSkelton(id));
        var node = $('#'+id);
        setValues(node, data);
        node.show(10);
        $('body,html').animate({scrollTop: node.offset().top}, 200);
    }
};

