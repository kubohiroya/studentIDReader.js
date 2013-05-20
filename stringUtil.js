/**
   16進数表記を返す
   @param [Array] ary 元データの配列
*/
module.exports.hex_dump = function(ary){
    var ret = '';
    for(var i = 0; i<ary.length; i++){
        ret += ary[i].toString(16);
    }
    return ret;
}

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

module.exports.format02d = function(value){
    if(value < 10){
        return '0'+value;
    }else{
        return ''+value;
    }
};

module.exports.parseIntegerArgs = function(values, keys){
    var entry = {};
    for(var i = 0; i < keys.length; i++){
        var value = values[i];
        for(var j = 0; j < value.length; j++){
            if(value[j] != '0'){
                value = value.substring(j);
                break;
            }
        }
        entry[keys[i]] = parseInt(value);
    }
    return entry;
};
