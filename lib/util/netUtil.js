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

exports.netUtil = {
    getAddress: function () {
        var address;
        var addressList = exports.netUtil.getGlobalAddressList();
        if (addressList.length === 0) {
            var addressList = exports.netUtil.getLocalAddressList();
            if (0 == addressList.length) {
                console.log('[fatal] no network interface.');
                process.exit(-1);
            }
        }
        return addressList[0].address;
    },

    getLocalAddressList: function () {
        var addressList = [];
        var interfaceList = os.networkInterfaces();
        for (var key in interfaceList) {
            interfaceList[key].forEach(function (value) {
                if (value.family === 'IPv4' && value.internal === true) {
                    addressList.push(value);
                }
            });
        }
        return addressList;
    },

    getGlobalAddressList: function () {
        var addressList = [];
        var interfaceList = os.networkInterfaces();
        for (var key in interfaceList) {
            interfaceList[key].forEach(function (value) {
                if (value.family === 'IPv4' && value.internal === false) {
                    addressList.push(value);
                }
            });
        }
        return addressList;
    }
};
return exports;