module.exports.id2logname = function (id_code){
    if(id_code =~ /^0/) {
        return "a" + (""+id_code).substring(1);
    }else if(id_code =~ /^1/) {
        return "b" + (""+id_code).substring(1);
    }else{
        return id_code;
    }
};

return module.exports;