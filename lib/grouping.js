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

/* jslint node: true */
"use strict";
/**
   学生名簿に学生データが存在し、かつ、
   学生証から学籍番号が読み取れた場合
*/

var DEBUG = false;

exports.MemberGroups = function(numGroups){

    this.numGroups = numGroups;
    this.groupMembers = [];
    this.mapMemberToGroupIndex = {};

    for(var i = 0; i< this.numGroups; i++){
        this.groupMembers.push([]);
    }

    this.selecetCandidateGroups = function(){
        var max = 0;
        var maxCount = 0;
        var i;
        
        for(i = 0; i < this.numGroups; i++){
            var numMembers = this.groupMembers[i].length;
            if(max < numMembers){
                max = numMembers;
                maxCount = 1;
            }else if(max == numMembers){
                maxCount++;
            }
        }

        if(DEBUG){
            console.log("===============");
            console.log("max "+max);
            console.log("maxCount "+maxCount);
        }

        var candidateGroups = [];

        if(maxCount == this.numGroups){
            for(i = 0; i < this.numGroups; i++){
                candidateGroups[i] = i;
            }
            return candidateGroups;
        }else{
            for(i = 0; i < this.numGroups; i++){
                if(this.groupMembers[i].length != max){
                    candidateGroups.push(i);
                }
            }
            return candidateGroups;
        }
    };

    this.chooseRandomCandidateGroupIndex = function(){
        var candidateGroups = this.selecetCandidateGroups();
        return candidateGroups[Math.floor(Math.random() * candidateGroups.length)];
    };

    this.addGroupMember = function(groupIndex, member_id){
        this.groupMembers[groupIndex].push(member_id);
        this.mapMemberToGroupIndex[member_id] = groupIndex;
    };

    this.getGroupMembers = function(groupIndex){
        return this.groupMembers[groupIndex];
    };

    this.getGroupIndexOf = function(member_id){
        return this.mapMemberToGroupIndex[member_id];
    };
};


/*


OnRead.prototype.on_attend = function(deviceIndex, read_status, student){
    if(DEBUG){
        console.log( read_status.lasttime.get_yyyymmdd_hhmmss());
        console.log( MESSAGE_ATTEND+" "+student.id_code+" "+student.fullname);
    }

    


    var groupID = groupIndex + 1;

    this.send({
        command: 'onRead',
        time:read_status.lasttime.getTime(),
        id_code:read_status.id,
        student:student,
        result:MESSAGE_ATTEND,
        deviceIndex: deviceIndex,
        groupID: groupID
    });
    
    return {groupID: groupID};
};
*/


