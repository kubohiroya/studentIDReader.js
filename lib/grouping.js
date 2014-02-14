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

var DEBUG = false;

/**
@param [Integer] numGroups グループ分けするグループの数
@param [Integer] numMininumMembers 出席者の最低人数
*/
exports.MemberGroups = function (numGroups, numMinimumMembers) {

    this.numGroups = numGroups;
    this.numMinimumMembers = numMinimumMembers;

    this.groupMembers = [];
    this.mapMemberToGroupIndex = {};

    var i,j;

    if (numGroups <= 0){
        throw "[fatal] nuGroups <= 0";
    }

    if ( numMinimumMembers && 0 < numMinimumMembers ){
        if ( numMinimumMembers % numGroups !== 0 ) {
            throw "numMinimumMembers % numGroups != 0";
        }

        this.shuffledNumbers = [];
        for( i = 0; i < numMinimumMembers; i+= numGroups) {
            for( j = 0; j < numGroups; j++) {
                this.shuffledNumbers.push(j);
            }
        }
        this.shuffledNumbers.shuffle();
        //console.log(this.shuffledNumbers);
    }

    for (i = 0; i < this.numGroups; i++) {
        this.groupMembers[i] = {};
    }


   this.selectCandidateGroups = function () {

        var numMembersParGroupMax = 0;
        var numSelectCandidateGroups = 0;
        var i;

        for (i = 0; i < this.numGroups; i++) {
            var numMembersParGroup = Object.keys(this.groupMembers[i]).length;
            if (numMembersParGroupMax < numMembersParGroup) {
                numMembersParGroupMax = numMembersParGroup;
                numSelectCandidateGroups = 1;
            } else if (numMembersParGroupMax == numMembersParGroup) {
                numSelectCandidateGroups++;
            }
        }

        var candidateGroups = [];

        if (numSelectCandidateGroups == this.numGroups) {
            for (i = 0; i < this.numGroups; i++) {
                candidateGroups.push(i);
            }
            if (DEBUG) {
                console.log('= ', numMembersParGroupMax, ' : ', this.groupMembers, '\t', candidateGroups);
            }

            return candidateGroups;
        } else {
            for (i = 0; i < this.numGroups; i++) {
                if (Object.keys(this.groupMembers[i]).length < numMembersParGroupMax) {
                    candidateGroups.push(i);
                }
            }
            if (DEBUG) {
                console.log('* ', numMembersParGroupMax, ' : ',  this.groupMembers, '\t', candidateGroups);
            }
            return candidateGroups;
        }
    };


    this.chooseRandomCandidateGroupIndex = function () {
        if (this.numMinimumMembers && Object.keys(this.mapMemberToGroupIndex).length < this.numMinimumMembers ) {
            if (DEBUG) {
                console.log("mode 0 : "+ Object.keys(this.mapMemberToGroupIndex).length);
            }
            return this.shuffledNumbers.pop();
        } else {
            if (DEBUG) {
                console.log("mode 1 : "+ Object.keys(this.mapMemberToGroupIndex).length);
            }

            var candidateGroups = this.selectCandidateGroups();

            return candidateGroups[Math.floor(Math.random() * candidateGroups.length)];
        }
    };

    this.addGroupMember = function (groupIndex, userID) {
        if(! this.groupMembers[groupIndex]){
            this.groupMembers[groupIndex] = {};
        }
        this.groupMembers[groupIndex][userID] = true;
        this.mapMemberToGroupIndex[userID] = groupIndex;
    };

    this.chooseAndAddRandomCandidateGroupIndex = function (userID) {
        var groupIndex = this.chooseRandomCandidateGroupIndex();
        if (DEBUG) {
            console.log("store user:"+userID+" into group  ===> "+groupIndex);
        }
        this.addGroupMember(groupIndex, userID);
        return groupIndex;
    };

    this.getGroupMembers = function (groupIndex) {
        return this.groupMembers[groupIndex];
    };

    this.getGroupIndexOf = function (userID) {
        return this.mapMemberToGroupIndex[userID];
    };
};