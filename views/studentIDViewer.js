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

var DEBUG = false;

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
var noactionSound = new Audio("sounds/tm2_stone001.wav");

var heartBeatMissingErrorThreashold = 6;
var heartBeatMissingCount = 0;

var queryStrings = parseQueryString(location.search);
var sessionKey = queryStrings.key;
var mode = queryStrings.mode;

var AttendeeModel = function () {
    this.nodeIndex = 0;
    this.numAttendee = 0;
};

AttendeeModel.prototype.onStartUp = function (json) {
    $('#console')
        .find('span.lectureName').text(json.lecture.name).end()
        .find('span.teacherName').text(json.lecture.teacherName).end()
        .find('span.numEnrollments').text(json.numEnrollments).end();
    this.enrollmentTableBody = $('#enrollmentTableBody');
};

AttendeeModel.prototype.addEnrollmentItem = function (userID, fullname, furigana) {
    this.enrollmentTableBody.append(this.createTrSkelton(userID));
    var trNode = $('#tr' + userID);
    this.setTrValues(trNode, {
        'student': {
            'userID': userID,
            'fullname': fullname,
            'furigana': furigana
        }
    });
};

AttendeeModel.prototype.onUpdate = function (json) {
    if (DEBUG) {
        console.log("onUpdate:" + JSON.stringify(json));
    }
    if (json.result == '出席') {
        this.numAttendee++;
        $('#attendeeInfo span.numAttendee').text(this.numAttendee);
        if (json.sound === true) {
            playAudio(okSound);
        }

        var trNode = $('#tr' + json.student.userID);
        this.setTrValues(trNode, json);
    } else if (json.result === '出席(継続読み取り)' || json.result === '(処理済み)') {
        if (json.sound === true) {
            playAudio(noactionSound);
        }
    } else {
        if (json.sound === true) {
            playAudio(ngSound);
        }
    }

    var id = 'node' + (this.nodeIndex++);
    $('#attendeeList').append(this.createArticleSkelton(id));
    var articleNode = $('#article' + id);
    this.setArticleValues(articleNode, json);

    if (json.deviceIndex && json.deviceIndex % 2 == 1) {
        articleNode.show().find(".articleBody").css("right", "-1600px").animate({
            "right": "0px"
        }, "slow");
    } else {
        articleNode.show().find(".articleBody").css("left", "-1600px").animate({
            "left": "0px"
        }, "slow");
    }

    $('div#body,html').animate({
        scrollTop: articleNode.offset().top
    }, 200)

};

AttendeeModel.prototype.createArticleSkelton = function (id) {
    return "<article id='article" + id + "' style='display:none' class='item'>" +
        "<div class='articleBody'>" +
        "<div class='datetime'><span class='date'/> <span class='time'/></div>" +
        "<div class='userID'></div>" +
        "<div class='furigana'></div>" +
        "<div class='fullname'></div>" +
        "<div class='result'></div>" +
        "<div class='group'>第<span class='groupID'></span>班</div>" +
        "</div>" +
        "</article>\n";
};

AttendeeModel.prototype.createTrSkelton = function (id) {
    return "<tr id='tr" + id + "' class='item disabled'>" +
        "<td class='userID'></td>" +
        "<td class='furigana'></td>" +
        "<td class='fullname'></td>" +
        "<td class='datetime'><span class='date'/> <span class='time'/></td>" +
        "<td class='result'></td>" +
        "<td class='group'><span class='groupID'></span></td>" +
        "</tr>\n";
};

AttendeeModel.prototype.setArticleValues = function (node, json) {
    var time = new Date();
    time.setTime(parseInt(json.time));
    var datetime = formatTime(time);
    node.find('span.date').text(datetime[0]).end()
        .find('span.time').text(datetime[1]).end()
        .find('div.result').text(json.result).end();
    if (json.student) {
        node.find('div.fullname').text(json.student.fullname).end()
            .find('div.furigana').text(json.student.furigana).end()
            .find('div.userID').text(json.student.userID).end();
        if (json.groupID) {
            node.css('height', '195px');
            node.find('div.articleBody').css('height', '195px').end();
            node.find('div.group').show().find('span.groupID').text(json.groupID).end();
        }
    } else {
        node.find('div.fullname').text('').end()
            .find('div.furigana').text('').end();
    }
};

AttendeeModel.prototype.setTrValues = function (node, json) {
    if (json.time) {
        var time = new Date();
        time.setTime(parseInt(json.time));
        var datetime = formatTime(time);
        node.find('span.date').text(datetime[0]).end()
            .find('span.time').text(datetime[1]).end()
            .find('td.result').text(json.result).end();
        node.removeClass('disabled');
    }
    if (json.student) {
        node.find('td.fullname').text(json.student.fullname).end()
            .find('td.furigana').text(json.student.furigana).end()
            .find('td.userID').text(json.student.userID).end();
        if (json.groupID) {
            node.find('td.group').find('span.groupID').text(json.groupID).end();
        }
    } else {
        node.find('td.fullname').text('').end()
            .find('td.furigana').text('').end();
    }
    $("#enrollmentTable").trigger("update");
};


var attendeeModel = new AttendeeModel();
var hostname = window.location.hostname;
var socket = new WebSocket('ws://' + hostname + ':8889/');

function parseQueryString(queryString) {
    if (queryString == 'undefined' || queryString == '') {
        return false;
    } else {
        if (queryString.substr(0, 1) == '?') {
            queryString = queryString.substr(1);
        }

        var components = queryString.split('&');

        var finalObject = new Object();
        var parts;
        for (var i = 0; i < components.length; i++) {
            parts = components[i].split('=');
            finalObject[parts[0]] = decodeURI(parts[1]);
        }

        return finalObject;
    }
}

function getAcademicTime(now) {
    var earlyMargin = EARLY_MARGIN;
    var lateMargin = LATE_MARGIN;
    for (var i = 0; i < ACADEMIC_TIME.length; i++) {
        var t = ACADEMIC_TIME[i];
        var nowTime = now.getHours() * 60 + now.getMinutes();
        var start = t[0] * 60 + t[1];
        if (start - earlyMargin <= nowTime &&
            nowTime <= start + lateMargin) {
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

function formatTime(time) {
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
    var datetime = formatTime(new Date());
    $('#date').text(datetime[0]);
    $('#time').text(datetime[1]);

    if (0 < heartBeatMissingCount) {
        heartBeatMissingCount += 1;
    }
    if (isConnected()) {
        hideDisconnectedMessage();
        setTimeout(updateTimer, 1000);
    } else {
        showDisconnectedMessage("disconnected");
    }
}

function isConnected() {
    if (DEBUG) {
        console.log("isConnected "+(heartBeatMissingCount)+" < "+(heartBeatMissingErrorThreashold));
    }
    return heartBeatMissingCount < heartBeatMissingErrorThreashold;
}

function showDisconnectedMessage(message) {
    if (heartBeatMissingErrorThreashold !== 0) {
        $('#message').show().addClass('glassPane').text('ERROR:' + message);
        heartBeatMissingErrorThreashold = 0;
    } else {
        $('#message').show().addClass('glassPane');
    }
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
    heartBeatMissingCount = 1;
    $('#heartBeat' + index).css('opacity', "" + (heartBeatMode[index]++) % 2);
}

function rotateAdminConsole() {
    var adminConsole = $("#adminConsole");
    var adminConsoleFixed = $("#adminConsoleFixed");
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
    var adminConsole = $("#adminConsole");
    var adminConsoleFixed = $("#adminConsoleFixed");
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

socket.onopen = function () {
    socket.send(JSON.stringify({sessionKey:sessionKey}));
    hideDisconnectedMessage();
    if (mode === 'admin') {
        $('#config').show();
        $('#waitPrompt').hide();
    } else {
        $('#config').hide();
        $('#waitPrompt').show();
    }
    $('#init').show();
};

socket.onclose = function () {
    showDisconnectedMessage("server is down.");
};

socket.onmessage = function (message) {
    var json = JSON.parse(message.data);
    if (json.command == 'onStartUp') {

        attendeeModel.onStartUp(json);

        $('#init').hide();
        $('#run').show();

        if (json.enrollmentTable) {
            Object.keys(json.enrollmentTable).forEach(function (key) {
                var value = json.enrollmentTable[key];
                attendeeModel.addEnrollmentItem(key, value.fullname, value.furigana);
            });
        }

        if (json.resumeEntryList) {
            json.resumeEntryList.forEach(function (value) {
                attendeeModel.onUpdate(value);
            });
        }

    } else if (json.command == 'onReaderError') {
        showDisconnectedMessage(json.message);
    } else if (json.command == 'onResume') {
        attendeeModel.onUpdate(json);
    } else if (json.command == 'onRead') {
        attendeeModel.onUpdate(json);
    } else if (json.command == 'onAdminCardReading') {
        rotateAdminConsole();
    } else if (json.command == 'onIdle') {
        hideAdminConsole();
    } else if (json.command == 'onHeartBeat') {
    }
    heartBeat(json.deviceIndex);
};

$(window).unload(function () {
    socket.onclose();
});

$(function () {
    var viewMode = 0;

    $('#console').draggable().click(function () {

        viewMode = (viewMode + 1) % 2;

        if (viewMode === 0) {
            $('#enrollmentTable').hide();
            $('#attendeeList').show();
        } else if (viewMode === 1) {
            $('#enrollmentTable').show();
            $('#attendeeList').hide();
        }
    });

    $('#enrollmentTable').tablesorter();

    var qrcode = new QRCodeLib.QRCodeDraw();
    var url = 'http://' + window.location.hostname + ':' + window.location.port + '/?key=' + sessionKey;
    qrcode.draw(document.getElementById('qrcode'), url, function () {});
    $('#adminConsoleUrl').text(url);
});

updateTimer();