Object.prototype.values = function(keys){
    var ret = [];

    for(var i = 0; i < keys.length; i++){
        var key = keys[i];
        var value = this[key];
        ret.push(value);
    }
    return ret;
};
/*
var test = {a:1,b:2,c:3};
console.log(test.values(['a','c','b']).join(','));
*/
