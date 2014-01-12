var assert = require('assert');
var cuc = require('../lib/cuc');

describe('id2logname', function(){
        it('学籍番号からアカウント名(ログイン名)を取得できる', function(){
                assert.equal(cuc.id2logname('1440001'), 'b440001');
            });
    });
