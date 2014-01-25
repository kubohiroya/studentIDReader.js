/*global require, describe, it, before, beforeEach, after, afterEach, console */

var assert = require('assert');
require('../lib/util/arrayUtil.js');
var MemberGroups = require('../lib/grouping.js').MemberGroups;

var dummyUserID = 0;


function createRange(start, count){
    var assertArray = [];
    for (var i = 0; i < count; i++) {
        assertArray.push(start+i);
    }
    return assertArray;
}

function createCount(grouping, numMinimumMembers, numGroups){
    var count = {};
    for (var dummyUserIDBase = 0; dummyUserIDBase < numMinimumMembers; dummyUserIDBase += numGroups ){
        for(var dummyUserID = dummyUserIDBase; dummyUserID < dummyUserIDBase + numGroups; dummyUserID++ ){
            var groupIndex = grouping.getGroupIndexOf(dummyUserID);
            if(! count[groupIndex]){
                count[groupIndex]=1;
            }else{
                count[groupIndex]++;
            }
        }
    }
    return count;
}


describe('逐次ランダムなグループ分け', function(){
        var numUsers =  30;
        var numGroups = 6;
        var grouping = new MemberGroups(numGroups);

        var assertArray = createRange(0, numGroups);

        for (var dummyUserID = 0; dummyUserID < numUsers; dummyUserID++ ){
            var groupIndex = grouping.chooseRandomCandidateGroupIndex();
            grouping.addGroupMember(groupIndex, dummyUserID);
        }

        it('グループ数ごとの逐次ランダムなグループ分け', function(){
                for (var dummyUserIDBase = 0; dummyUserIDBase < numUsers; dummyUserIDBase += numGroups ){
                    var segment = [];
                    for(var dummyUserID = dummyUserIDBase; dummyUserID < dummyUserIDBase + numGroups; dummyUserID++ ){
                        var groupIndex = grouping.getGroupIndexOf(dummyUserID);
                        segment.push(groupIndex);
                    }
                    //console.log(segment);
                    assert.deepEqual(segment.sort(), assertArray.sort());
                }
            });
    });

describe('複合的なグループ分け', function(){

        var numUsers = 120;
        var numGroups = 10;
        var numMinimumMembers = 60;

        var grouping = new MemberGroups(numGroups, numMinimumMembers);

        var assertArray = createRange(0, numGroups);

        for (var dummyUserID = 0; dummyUserID < numUsers; dummyUserID++ ){
            grouping.chooseAndAddRandomCandidateGroupIndex(dummyUserID);
        }

        it('テスト条件の確認', function(){
                assert.equal(true, numUsers % numGroups === 0);
                assert.equal(true, numMinimumMembers % numGroups === 0);
                assert.equal(true, numMinimumMembers <= numUsers);
            });

        it('ユーザのうち一定については完全にランダム(mode 0)', function(){
            //assert mode 0
            var count0 = createCount(grouping, numMinimumMembers, numGroups);

            for(var groupIndex = 0; groupIndex < numGroups; groupIndex++){
                assert.equal(count0[groupIndex], numMinimumMembers / numGroups);
            }
        });

        it('追加分についてはグループ数ごとの逐次ランダムグなループ分け(mode 1)', function(){
            //assert mode 1
            var count1 = {};

            for (var dummyUserIDBase = numMinimumMembers; dummyUserIDBase < numUsers; dummyUserIDBase += numGroups ){
                var segment = [];
                for(var dummyUserID = dummyUserIDBase; dummyUserID < dummyUserIDBase + numGroups; dummyUserID++ ){
                    var selectedGroupIndex = grouping.getGroupIndexOf(dummyUserID);
                    if(! count1[selectedGroupIndex]){
                        count1[selectedGroupIndex]=1;
                    }else{
                        count1[selectedGroupIndex]++;
                    }
                    segment.push(selectedGroupIndex);
                }
                assert.deepEqual(segment.sort(), assertArray.sort());
            }

            for(var groupIndex = 0; groupIndex < numGroups; groupIndex++){
                assert.equal(count1[groupIndex], (numUsers - numMinimumMembers) / numGroups);
            }
        });

    });
