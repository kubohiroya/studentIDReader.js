var fs = require("fs");

var xlsxjs = require('xlsx');

module.exports.stringify = function stringify(val) {
    if(! val){
        return null;
    }
                switch(val.t){
                case 'n': return String(val.v);
                case 's': case 'str':
                if(typeof val.v === 'undefined') return "undef";
                return val.v;
                //return JSON.stringify(val.v);
                case 'b': return val.v ? "TRUE" : "FALSE";
                case 'e': return ""; /* throw out value in case of error */
                default: throw 'unrecognized type ' + val.t;
                }
};


module.exports.forEachLineSync = function(filename, opt, keys, callback){
        if(filename.endsWith('.csv') || filename.endsWith('.txt')){
            return fs.readFileSync(filename, opt.encoding).toString().split(/[\n\r]+/).forEach(function(line){
                    if(line.match(/^\#/) || line.length == 0){
                        return;
                    }
                    console.log("line:"+line);
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


            var xlsx = xlsxjs.readFile(filename);
            var sheetname = xlsx.SheetNames[0];
            var sheet = xlsx.Sheets[sheetname];
            
            if(sheet["!ref"]) {
                var r = xlsxjs.utils.decode_range(sheet["!ref"]);
                for(var R = r.s.r; R <= r.e.r; ++R) {
                    var entry = {};
                    for(var C = r.s.c; C <= r.e.c; ++C) {
                        var val = sheet[xlsxjs.utils.encode_cell({c:C,r:R})];

                        entry[keys[C]] = exports.stringify(val);
                    }
                    callback(entry);
                }
            }

        }else if(filename.endsWith('.xlsx-')){
            var sheet = xlsx(fs.readFileSync(filename, 'base64').toString());
            
            var rows = sheet.worksheets[0].data;

            console.log("0,0="+rows[0][0].value);
            console.log("1,0="+rows[1][0].value);

            for(var j = 0; j < rows.length; j++){
                var row = rows[j];
                var entry = {};
                for(var i = 0; i < keys.length; i++){
                    if(row[i] && row[i].value){
                        entry[keys[i]] = row[i].value;
                    }else{
                        entry[keys[i]] = null;
                    }
                }
                callback(entry);
            }
        }
};

