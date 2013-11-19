/*
  foreach library
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

var fs = require('fs');
var xlsxjs = require('xlsx');
var XLSXJS = true;

var Iconv = require('iconv').Iconv;

exports.stringify = function stringify(val) {
    if (!val) {
        return null;
    }
    switch (val.t) {
    case 'n':
        return String(val.v);
    case 's':
    case 'str':
        if (typeof val.v === 'undefined'){
            return "undef";
        }
        return val.v;
        //return JSON.stringify(val.v);
    case 'b':
        return val.v ? "TRUE" : "FALSE";
    case 'e':
        return ""; /* throw out value in case of error */
    default:
        throw 'unrecognized type ' + val.t;
    }
};

exports.forEachLineSync = function (filename, opt, keys, callback) {
    if (!fs.existsSync(filename)) {
        return;
    }
    var entry;
    if (filename.endsWith('.csv') || filename.endsWith('.txt')) {
        var iconv = new Iconv(opt.encoding, 'UTF-8//TRANSLIT//IGNORE');
        var content = iconv.convert(fs.readFileSync(filename)).toString();
        content.split(/[\n\r]+/).forEach(function (line) {
            if (line.match(/^\#/) || line.length === 0) {
                return;
            }
            var values = line.split(opt.separator);
            entry = {};
            for (var i = 0; i < keys.length; i++) {
                if (i < values.length) {
                    entry[keys[i]] = values[i];
                } else {
                    entry[keys[i]] = "";
                }
            }
            //console.log("###"+line);
            callback(entry);
        });
    } else if (filename.endsWith('.xlsx')) {
        var sheet;
        if (XLSXJS) {
            var xlsxData = xlsxjs.readFile(filename);
            var sheetname = xlsxData.SheetNames[0];
            sheet = xlsxData.Sheets[sheetname];

            if (sheet["!ref"]) {
                var r = xlsxjs.utils.decode_range(sheet["!ref"]);
                for (var R = r.s.r; R <= r.e.r; ++R) {
                    entry = {};
                    for (var C = r.s.c; C <= r.e.c; ++C) {
                        var val = sheet[xlsxjs.utils.encode_cell({
                            c: C,
                            r: R
                        })];
                        entry[keys[C]] = exports.stringify(val);
                    }
                    callback(entry);
                }
            }
        } else {
            sheet = xlsxjs(fs.readFileSync(filename, 'base64').toString());
            var rows = sheet.worksheets[0].data;
            for (var j = 0; j < rows.length; j++) {
                var row = rows[j];
                entry = {};
                for (var i = 0; i < keys.length; i++) {
                    if (row[i] && row[i].value) {
                        entry[keys[i]] = row[i].value;
                    } else {
                        entry[keys[i]] = null;
                    }
                }
                callback(entry);
            }
        }
    }
};

return exports;