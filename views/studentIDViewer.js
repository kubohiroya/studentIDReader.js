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

AttendeeList.prototype.onStartUp = function(json){
    $('#console').find('span.classname').text(json.classname).end()
    .find('span.teacher').text(json.teacher).end()
    .find('span.max').text(json.max).end();
};

var playAudio = function(audio){
    if(!audio.ended || 0 < audio.currentTime){
        audio.pause();
        audio.currentTime = 0;
    }
    okSound.play();
};

AttendeeList.prototype.onUpdate = function(json){
    if(json.result == '出席'){
        this.numAttendance++;
        $('#attendanceInfo span.current').text(this.numAttendance);
        if(json.sound == true){
            playAudio(okSound);
        }
    }else{
        if(json.sound == true){
            playAudio(ngSound);
        }
    }

    var id = 'node'+(this.nodeIndex++);
    $('#attendanceList').append(this._createSkelton(id));

    var node = $('#'+id);

    this._setValues(node, json);

    if(json.deviceIndex && json.deviceIndex % 2 == 1){
        node.show().find(".articleBody").css("right","-1600px").animate({"right":"0px"}, "slow");
    }else{
        node.show().find(".articleBody").css("left","-1600px").animate({"left":"0px"}, "slow");
    }

    $('body,html').animate({scrollTop: node.offset().top}, 200);
};

AttendeeList.prototype._createSkelton = function(id){
    return "<article id='"+id+"' style='display:none' class='item'>"+
    "<div class='articleBody'>"+
    "<div class='datetime'><span class='date'/> <span class='time'/></div>"+
    "<div class='id_code'></div>"+
    "<div class='furigana'></div>"+
    "<div class='fullname'></div>"+
    "<div class='result'></div>"+
    "</div>"+
    "</article>\n";
};

AttendeeList.prototype._setValues = function(node, json){
    var time = new Date();
    time.setTime(parseInt(json.time));
    var datetime = format_time(time);
    node.find('span.date').text(datetime[0]).end()
        .find('span.time').text(datetime[1]).end()
        .find('div.result').text(json.result).end()
        .find('div.id_code').text(json.id_code).end();
    if(json.student){
        node.find('div.fullname').text(json.student.fullname).end()
            .find('div.furigana').text(json.student.furigana).end();
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
    var json = JSON.parse(message.data);
    if(json.command == 'onStartUp'){
        attendeeList.onStartUp(json);
    }else if(json.command == 'onResume'){
        json.sound = false;
        attendeeList.onUpdate(json);
    }else if(json.command == 'onRead'){
        json.sound = true;
        attendeeList.onUpdate(json);
    }else if(json.command == 'onHeartBeat'){
        heartBeat(json.deviceIndex);
    }else if(json.command == 'onAdminCardReading'){
        rotateAdminConsole();
    }else if(json.command == 'onIdle'){
        hideAdminConsole();
    }
};

updateTimer();

var heartBeatMode = [0, 0];

function heartBeat(index){
    $('#heartBeat'+index).css('opacity', ""+(heartBeatMode[index]++) % 2);
}


var adminConsoleRotate = 0;
function rotateAdminConsole(){
    var adminConsole = $("#admin_console");
    var adminConsoleFixed = $("#admin_console_fixed");
    if(! adminConsole.hasClass("adminConsoleOn")){
        adminConsoleFixed.css("-webkit-transform", "rotate(0deg)");
        adminConsole.addClass("adminConsoleOn").css("-webkit-transform", "rotate(0deg)").fadeIn(1000, function(){
                adminConsole.css("-webkit-transition", "-webkit-transform 2s linear")
                    .css("-webkit-transform", "rotate(360deg)");
            });
    }
    /*
    if(parseFloat(adminConsole.css("opacity")) == 1.0){
        adminConsoleRotate++;
        var degree = 360 * (adminConsoleRotate % 36 / 36.0);
        adminConsole.css("-webkit-transform", "rotate("+degree+"deg)");
        }*/
}

function hideAdminConsole(){
    adminConsoleRotate = 0;
    var adminConsole = $("#admin_console");
    var adminConsoleFixed = $("#admin_console_fixed");
    if(adminConsole.hasClass("adminConsoleOn")){
        adminConsole.removeClass("adminConsoleOn");

        var matrix = adminConsole.css("-webkit-transform");

        var m = matrix.match(/([-]?\d+\.?\d*)\,\s([-]?\d+\.?\d*)\,\s([-]?\d+\.?\d*)\,\s([-]?\d+\.?\d*)\,\s([-]?\d+\.?\d*)\,\s([-]?\d+\.?\d*)/i);
        for(var i = 1; i <= 6; i++){
            m[i] = parseFloat(m[i]);
        }

        var th;
        var cp = Math.sqrt(m[2] * m[2] + m[4] * m[4]);
        if(cp != 0){
            th = Math.atan2(-1 * m[2], m[4]);
        }else{
            th = Math.atan2(m[3], m[1]);
        }
        var deg = ( -180 * th / Math.PI);
        deg = (deg < 0)? 360 + deg : deg;

        $("#rotate_result").text("回転角度 = "+deg);

        adminConsoleFixed.css("-webkit-transform", matrix).show().fadeOut(500);

        adminConsole.hide();
    }
}

