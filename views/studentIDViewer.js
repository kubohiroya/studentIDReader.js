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
/* global require, console, Audio, WebSocket, window, $*/
/* jslint node: true */
"use strict";

var WDAY = ['日', '月', '火', '水', '木', '金', '土'];

//大学の授業の開始時間 [[時,分],[時,分]...]
var ACADEMIC_TIME = [
    [0, 0],
    [9, 0],
    [10, 40],
    [13, 10],
    [14, 50],
    [16, 30],
    [18, 10]
];

//授業開始時間よりも何分前から出席を取るか？
var EARLY_MARGIN = 15;
//授業開始時間から何分後まで出席を取るか？
var LATE_MARGIN = 90;

var adminConsoleRotate = 0;
var heartBeatMode = [0, 0];
var okSound = new Audio("sounds/tm2_chime002.wav");
var ngSound = new Audio("sounds/tm2_quiz003bad.wav");

var heartBeatMissingErrorThreashold = 5;
var heartBeatMissingCount = -1;

function getAcademicTime(now) {
    var early_margin = EARLY_MARGIN;
    var late_margin = LATE_MARGIN;
    for (var i = 0; i < ACADEMIC_TIME.length; i++) {
        var t = ACADEMIC_TIME[i];
        var now_time = now.getHours() * 60 + now.getMinutes();
        var start = t[0] * 60 + t[1];
        if (start - early_margin <= now_time &&
            now_time <= start + late_margin) {
            return i;
        }
    }
    return 0;
}

function format02d(value) {
    if (value < 10) {
        return '0' + value;
    } else {
        return '' + value;
    }
}

function format_time(time) {
    var atime = getAcademicTime(time);
    if (atime !== 0) {
        return [time.getFullYear() + '年 ' +
            format02d(time.getMonth() + 1) + '月 ' +
            format02d(time.getDate()) + '日 ' +
            WDAY[time.getDay()] + '曜日 ' +
            atime + '限',
            format02d(time.getHours()) + ':' +
            format02d(time.getMinutes()) + ':' +
            format02d(time.getSeconds())];
    } else {
        return [time.getFullYear() + '年 ' +
            format02d(time.getMonth() + 1) + '月 ' +
            format02d(time.getDate()) + '日 ' +
            WDAY[time.getDay()] + '曜日',
            format02d(time.getHours()) + ':' +
            format02d(time.getMinutes()) + ':' +
            format02d(time.getSeconds())];
    }
}

function playAudio(audio) {
    audio.load();
    audio.play();
}

function updateTimer() {
    var datetime = format_time(new Date());
    $('#date').text(datetime[0]);
    $('#time').text(datetime[1]);

    if (0 <= heartBeatMissingCount) {
        heartBeatMissingCount += 1;
    }
    if (isConnected()) {
        hideDisconnectedMessage();
        setTimeout(updateTimer, 1000);
    } else {
        showDisconnectedMessage();
    }
}

function isConnected() {
    return heartBeatMissingCount < heartBeatMissingErrorThreashold;
}

function showDisconnectedMessage() {
    $('#message').show().addClass('glassPane').text('ERROR: disconnected.');
}

function hideDisconnectedMessage() {
    $('#message').hide().removeClass('glassPane').text('');
}

function showConfigPanel() {
    $('#config').show().addClass('glassPane').text("CONFIG");
}

function hideConfigPanel() {
    $('#config').hide().removeClass('glassPane').text('');
}

function heartBeat(index) {
    heartBeatMissingCount = 0;
    $('#heartBeat' + index).css('opacity', "" + (heartBeatMode[index]++) % 2);
}

function rotateAdminConsole() {
    var adminConsole = $("#admin_console");
    var adminConsoleFixed = $("#admin_console_fixed");
    if (!adminConsole.hasClass("adminConsoleOn")) {
        adminConsoleFixed.css("-webkit-transform", "rotate(0deg)");
        adminConsole.addClass("adminConsoleOn").css("-webkit-transform", "rotate(0deg)").fadeIn(1000, function () {
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

function hideAdminConsole() {
    adminConsoleRotate = 0;
    var adminConsole = $("#admin_console");
    var adminConsoleFixed = $("#admin_console_fixed");
    if (adminConsole.hasClass("adminConsoleOn")) {
        adminConsole.removeClass("adminConsoleOn");

        var matrix = adminConsole.css("-webkit-transform");

        var m = matrix.match(/([-]?\d+\.?\d*)\,\s([-]?\d+\.?\d*)\,\s([-]?\d+\.?\d*)\,\s([-]?\d+\.?\d*)\,\s([-]?\d+\.?\d*)\,\s([-]?\d+\.?\d*)/i);
        for (var i = 1; i <= 6; i++) {
            m[i] = parseFloat(m[i]);
        }

        var th;
        var cp = Math.sqrt(m[2] * m[2] + m[4] * m[4]);
        if (cp !== 0) {
            th = Math.atan2(-1 * m[2], m[4]);
        } else {
            th = Math.atan2(m[3], m[1]);
        }
        var deg = (-180 * th / Math.PI);
        deg = (deg < 0) ? 360 + deg : deg;

        $("#message").text("回転角度 = " + deg);

        adminConsoleFixed.css("-webkit-transform", matrix).show().fadeOut(500);

        adminConsole.hide();
    }
}


var AttendeeList = function () {
    this.nodeIndex = 0;
    this.numAttendance = 0;
};

AttendeeList.prototype.onStartUp = function (json) {
    $('#console')
        .find('span.lecture_name').text(json.lecture.name).end()
        .find('span.teacher_name').text(json.lecture.teacher_name).end()
        .find('span.num_students').text(json.num_students).end();
};

AttendeeList.prototype.onUpdate = function (json) {
    if (json.result == '出席') {
        this.numAttendance++;
        $('#attendanceInfo span.num_attend').text(this.numAttendance);
        if (json.sound === true) {
            playAudio(okSound);
        }
    } else {
        if (json.sound === true) {
            playAudio(ngSound);
        }
    }

    var id = 'node' + (this.nodeIndex++);
    $('#attendanceList').append(this._createSkelton(id));

    var node = $('#' + id);

    this._setValues(node, json);

    if (json.deviceIndex && json.deviceIndex % 2 == 1) {
        node.show().find(".articleBody").css("right", "-1600px").animate({
            "right": "0px"
        }, "slow");
    } else {
        node.show().find(".articleBody").css("left", "-1600px").animate({
            "left": "0px"
        }, "slow");
    }

    $('body,html').animate({
        scrollTop: node.offset().top
    }, 200);
};

AttendeeList.prototype._createSkelton = function (id) {
    return "<article id='" + id + "' style='display:none' class='item'>" +
        "<div class='articleBody'>" +
        "<div class='datetime'><span class='date'/> <span class='time'/></div>" +
        "<div class='id_code'></div>" +
        "<div class='furigana'></div>" +
        "<div class='fullname'></div>" +
        "<div class='result'></div>" +
        "<div class='group'>第<span class='group_id'>x</span>班</div>" +
        "</div>" +
        "</article>\n";
};

AttendeeList.prototype._setValues = function (node, json) {
    var time = new Date();
    time.setTime(parseInt(json.time));
    var datetime = format_time(time);
    node.find('span.date').text(datetime[0]).end()
        .find('span.time').text(datetime[1]).end()
        .find('div.result').text(json.result).end()
        .find('div.id_code').text(json.student.id_code).end();
    if (json.student) {
        node.find('div.fullname').text(json.student.fullname).end()
            .find('div.furigana').text(json.student.furigana).end();
        if (json.student.group_id) {
            node.css('height', '195px');
            node.find('div.articleBody').css('height', '195px').end();
            node.find('div.group').show().find('span.group_id').text(json.student.group_id).end();
        }
    } else {
        node.find('div.fullname').text('').end()
            .find('div.furigana').text('').end();
    }
};

var attendeeList = new AttendeeList();
var socket = new WebSocket('ws://127.0.0.1:8889/');

socket.onopen = function () {
    console.log("open connection.");
    hideDisconnectedMessage();
    $('#config').show();
    console.log("show config");
};

socket.onclose = function () {
    console.log("close connection.");
    showDisconnectedMessage();
};

socket.onmessage = function (message) {
    var json = JSON.parse(message.data);
    console.log("command:" + json.command);
    if (json.command == 'onStartUp') {
        attendeeList.onStartUp(json);
        $('#config').hide();
        $('#run').show();
        
        json.ReadStatusDB.forEach(function(value){
            console.log(value.id_code+"\t"+value.firsttime+"\t"+value.lasttime);
            value.result = '出席';
            onUpdate(value);
        });
    } else if (json.command == 'onPaSoRiError') {
        console.log(json.message);
    } else if (json.command == 'onResume') {
        attendeeList.onUpdate(json);
    } else if (json.command == 'onRead') {
        attendeeList.onUpdate(json);
    } else if (json.command == 'onAdminCardReading') {
        rotateAdminConsole();
    } else if (json.command == 'onIdle') {
        hideAdminConsole();
    } else if (json.command == 'onHeartBeat') {
        //console.log('heartBeat');
    }
    heartBeat(json.deviceIndex);
};

$(window).unload(function () {
    socket.onclose();
});

updateTimer();
