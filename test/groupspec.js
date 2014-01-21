var assert = require('assert');
require('../lib/util/arrayUtil.js'); 
var MemberGroups = require('../lib/grouping.js').MemberGroups;

var dummyUserID = 0;

describe('逐次ランダムなグループ分け', function(){
        var numUsers = 100;
        var numGroups = 5;
        var grouping = new MemberGroups(numGroups);

        var assertArray = [];
        for (var i = 0; i < numGroups; i++) {
            assertArray.push(i);
        }

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
                    assert.deepEqual(segment.sort(), assertArray.sort());
                }
            });
    });

describe('複合的なグループ分け', function(){

        var numUsers = 120;
        var numGroups = 12;
        var numMinimumMembers = 60;
        
        var grouping = new MemberGroups(numGroups, numMinimumMembers);

        var assertArray = [];
        for (var i = 0; i < numGroups; i++) {
            assertArray.push(i);
        }

        for (var dummyUserID = 0; dummyUserID < numUsers; dummyUserID++ ){
            grouping.chooseAndAddRandomCandidateGroupIndex(dummyUserID);
        }

        it('テスト条件の確認', function(){
                assert.equal(true, numUsers % numGroups == 0);
                assert.equal(true, numMinimumMembers % numGroups == 0);
                assert.equal(true, numMinimumMembers <= numUsers);
            });

        it('ユーザのうち一定については完全にランダム(mode 0)', function(){
                //assert mode 0
                for (var dummyUserIDBase = 0; dummyUserIDBase < numMinimumMembers; dummyUserIDBase += numGroups ){
                    var segment = [];
                    for(var dummyUserID = dummyUserIDBase; dummyUserID < dummyUserIDBase + numGroups; dummyUserID++ ){
                        var groupIndex = grouping.getGroupIndexOf(dummyUserID);
                        segment.push(groupIndex);
                    }
                    assert.notDeepEqual(segment.sort(), assertArray.sort()); // in a certain case, this test may fail.
                }
            });

        it('追加分についてはグループ数ごとの逐次ランダムグなループ分け(mode 1)', function(){
                //assert mode 1
                for (var dummyUserIDBase = numMinimumMembers; dummyUserIDBase < numUsers; dummyUserIDBase += numGroups ){
                    var segment = [];
                    for(var dummyUserID = dummyUserIDBase; dummyUserID < dummyUserIDBase + numGroups; dummyUserID++ ){
                        var groupIndex = grouping.getGroupIndexOf(dummyUserID);
                        segment.push(groupIndex);
                    }
                    assert.deepEqual(segment.sort(), assertArray.sort());
                }
            });
    });
