/**
 * util.spec.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var util = require('../../lib/util');

describe('util', function(){
    describe('method#defineMember', function(){
        it('should define up to a parent member on given object by dot notation', function(done){
            var obj = {};

            util.defineMember(obj, 'a.b.c.d');

            obj.a.b.c.should.be.ok;
            done();
        })
    });
});