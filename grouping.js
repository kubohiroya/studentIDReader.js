/**
   学生名簿に学生データが存在し、かつ、
   学生証から学籍番号が読み取れた場合
*/

var DEBUG = false;

module.exports.MemberGroups = function(numGroups){

    this.numGroups = numGroups;
    this.groupMembers = [];
    this.mapMemberToGroupIndex = {};

    for(var i = 0; i< this.numGroups; i++){
        this.groupMembers.push([]);
    }

    this.selecetCandidateGroups = function(){
        var max = 0;
        var maxCount = 0;

        for(var i = 0; i < this.numGroups; i++){
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
            for(var i = 0; i < this.numGroups; i++){
                candidateGroups[i] = i;
            }
            return candidateGroups;
        }else{
            for(var i = 0; i < this.numGroups; i++){
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

return module.exports;
