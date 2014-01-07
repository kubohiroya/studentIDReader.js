/*
  network unility library
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

var os = require('os');

exports.netUtil ={
    get_address : function(){
    var address;
    var address_list = exports.netUtil.get_global_address_list();
    if(address_list.length === 0){
        var address_list = exports.netUtil.get_local_address_list();
        if(0 == address_list.length){
            console.log('[fatal] no network interface.');
            process.exit(-1);
        }
    }
    return address_list[0].address;
},

get_local_address_list : function(){
    var address_list = [];
    var interface_list = os.networkInterfaces();
    for(var key in interface_list){
        interface_list[key].forEach(function(value){
                if(value.family === 'IPv4' && value.internal === true){
                    address_list.push(value);
                }
            });
    }
    return address_list;
},

get_global_address_list : function (){
    var address_list = [];
    var interface_list = os.networkInterfaces();
    for(var key in interface_list){
        interface_list[key].forEach(function(value){
                if(value.family === 'IPv4' && value.internal === false){
                    address_list.push(value);
                }
            });
    }
    return address_list;
}
};
return exports;