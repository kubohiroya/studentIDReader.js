var fs = require("fs");
var xlsx = require("./xlsx.js");

module.exports.forEachLineSync = function(filename, opt, keys, callback){
        if(filename.endsWith('.csv')){
            return fs.readFileSync(filename, opt.encoding).toString().split('\n').forEach(function(line){
                    if(line.match(/^\#/) || line.length == 0){
                        return;
                    }
                    var values = line.split(opt.separator);
                    var entry = {};
                    for(var i = 0; i < keys.length; i++){
                        if(i < values.length){
                            entry[keys[i]] = values[i];
                        }else{
                            entry[keys[i]] = "";
                        }
                    }
                    return callback(entry);
                });
        }else if(filename.endsWith('.xlsx')){
            var sheet = xlsx(fs.readFileSync(filename, 'base64').toString());
            var rowHeader = true;
            sheet.worksheets[0].data.forEach(function(row){
                    if(rowHeader == false){
                        var entry = {};
                        for(var i = 0; i < keys.length; i++){
                            if(row[i] && row[i].value){
                                entry[keys[i]] = row[i].value;
                            }else{
                                entry[keys[i]] = null;
                            }
                        }
                        return callback(entry);
                    }
                    rowHeader = false;
                });
        }
};

