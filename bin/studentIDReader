#!/usr/bin/env node

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

var fs = require('fs');
var program = require('commander');

var pkg = require('../package.json');

require('../lib/util/dateUtil.js');
var enrollment = require('../lib/enrollment.js');
var model = require('../lib/model.js');
var ReaderKernel = require('../lib/kernel.js').ReaderKernel;

var ATTENDEE_DIR = 'var';
var HTTP_PORT = 8888;
var WS_PORT = 8889;
var AUTO_LAUNCH_BROWSER = true;
var PASORI_SAME_CARD_READ_IGNORE = 3000;

function loadEnrollmentFile(enrollmentFilename) {
    return (enrollmentFilename) ? enrollment.loadEnrollmentFile(enrollmentFilename, {
        encoding: 'Shift-JIS',
        separator: ','
    }) : undefined;
}

function loadTeacherFile(teacherFilename) {
    return (teacherFilename) ? enrollment.loadTeacherFile(teacherFilename, {
            encoding: 'utf-8',
            separator: ','
        },
        function (entry) {
            return new model.Teacher(entry.userID,
                entry.fullname,
                entry.logname);
        }) : undefined;
}


(function () {
    program
        .version(pkg.version)
        .description('FelicaLite(NFC) Student ID Card reader to Check Attendees of Lectures')
        .usage('[options] [enrollmentFilename]')
        .option('-v, --verbose',
            'enable verbose logging')
        .option('-t, --teachers <file>',
            'specify teacher definition file in csv format. optional.')
        .option('-d, --directory <directory>',
            'specify output directory of attendees files in csv format. default is ['+ATTENDEE_DIR+'].',
            ATTENDEE_DIR)
        .option('-b, --basename <name>',
            'specify output file basename of attendees in csv format. default is [yyyy_mm_dd_w_y].')
        .option('-g, --group <n>',
            'enable grouping by dividing into n number of groups. default is disabled.', parseInt)

    .option('-p, --httpport <n>',
        'HTTP port number. default is [8888].', 8888)
        .option('-P, --wsport <n>',
            'WebSocket port number. default is [8889].', 8889)
        .option('-D, --device <type>',
            'use NFC reader device. default is [pafe]', 'pafe')
        .option('-i, --interval <n>',
            'NFC reader device polling interval [3000] msec.', 3000)
        .option('-B, --disable-auto-launch-browser',
            'disable auto launch browser. default is enabled.')

    .parse(process.argv);


    if (program.group && program.group <= 0) {
        console.log("[FATAL] number of groups is invalid:" + program.group);
        process.exit(-1);
    }

    var teacherDB = loadTeacherFile(program.teachers);

    var attendeeDir = program.directory;
    if (!fs.existsSync(attendeeDir)) {
        fs.mkdirSync(attendeeDir);
    }
    if (!fs.statSync(attendeeDir).isDirectory()) {
        console.log('[FATAL] read error on attendeeDir:' + attendeeDir);
        process.exit(-1);
    } else {
        console.log('[INFO] output dir = ' + attendeeDir);
    }

    var attendeeFilenameBase = program.basename || new Date().get_yyyy_mm_dd_w_y();

    console.log('[INFO] basename = ' + attendeeFilenameBase);

    var enrollment = loadEnrollmentFile(program.args.shift());

    new ReaderKernel(
        program,
        teacherDB, (enrollment) ? enrollment.lecture : undefined, (enrollment) ? enrollment.enrollmentDB : undefined,
        attendeeDir,
        attendeeFilenameBase,
        loadTeacherFile,
        loadEnrollmentFile
    ).start();

})();