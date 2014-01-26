/*global require, describe, it, before, beforeEach, after, afterEach, console */

var assert = require('assert');
var fs = require('fs');

require('../lib/util/dateUtil.js');

var AttendeeDB = require('../lib/attendeeDB.js').AttendeeDB;
var ReadStatusFactory = require('../lib/model.js').ReadStatusFactory;
var ReadStatus = require('../lib/model.js').ReadStatus;
var MemberGroups = require('../lib/grouping.js').MemberGroups;

var LECTURE_ID = '00000';
var USER_ID = 'XXXX';

describe('attendeeDB', function(){

    var attendeeDir = '/tmp';
    var attendeeFilenameBase = 'hoge';
    var numGroups = 5;

    var lecture = {lectureID:LECTURE_ID};

    var grouping = new MemberGroups(numGroups);

    var readStatusFactory = function (attendFileEntry) {
        if (!attendFileEntry) {
            return undefined;
        } else if (attendFileEntry.lectureID === lecture.lectureID) {
            var yyyymmddhhmmss = (attendFileEntry.yyyymmdd + " " + attendFileEntry.hhmmss);
            var datetime = yyyymmddhhmmss.split(/[\s\-\:\,]/).createDateAs(['year', 'mon', 'day', 'hour', 'min', 'sec']);
            if (grouping && attendFileEntry.groupID) {
                var groupIndex = parseInt(attendFileEntry.groupID) - 1;
                grouping.addGroupMember(groupIndex, attendFileEntry.userID);
            }
            return new ReadStatus(attendFileEntry.lectureID, attendFileEntry.userID, datetime);
        } else if (attendFileEntry.lectureID) {
            console.log("[warn] lectureID missmatch:" + lecture.lectureID + " != " + attendFileEntry.lectureID);
        }
    };

    var attendFileEntryFactory = function (readStatus, student, groupID) {
        return {
            yyyymmdd: readStatus.time.get_yyyymmdd(),
            wdayatime: readStatus.time.get_wdayatime(),
            hhmmss: readStatus.time.get_hhmmss(),
            lectureID: readStatus.lectureID,
            userID: readStatus.userID,
            fullname: student ? student.fullname : undefined,
            furigana: student ? student.furigana : undefined,
            groupID: groupID ? groupID : undefined
        };
    };

    var attendeeDB = new AttendeeDB(attendeeDir,
        attendeeFilenameBase,
        readStatusFactory,
        attendFileEntryFactory);

    if(fs.exists(attendeeDB.csvDB.filename)){
        fs.unlinkSync(attendeeDB.csvDB.filename);
    }

    it('userIDをキーに保存(store)した値を、再度、userIDをキーに取得(get)できる', function(){
        var now = new Date();
        now.setTime(now.getTime() - now.getMilliseconds());
        var readStatus = new ReadStatus(LECTURE_ID, USER_ID, now);

        var student = {lectureID:LECTURE_ID, userID:USER_ID, time: now};

        var groupID = 1;

        attendeeDB.store(readStatus, student, groupID);

        assert.deepEqual(student, attendeeDB.get(student.userID));

        it('CSVファイルが保存される', function(){
            fs.stat(attendeeDB.csvDB.filename, function(stat){
                assert.equal(stat.isFile(), true);
            });

            it('CSVファイルの内容が正しく書き込まれる', function(){
                fs.stat(attendeeDB.csvDB.filename, function(stat){
                    //TODO
                });
            });
        });
    });

    //fs.unlinkSync(attendeeDB.csvDB.filename);
});
