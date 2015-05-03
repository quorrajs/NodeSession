/**
 * fileSessionHandler.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var FileSessionHandler = require('../../../lib/handler/FileSessionHandler');
var sessionStoragePath ='./test/sessions';

describe('FileSessionHandler', function(){
    var handler = new FileSessionHandler(sessionStoragePath);
    var sessionId = 'testsession';
    var testData = 'testData';

    before(function(){
        handler.gc(0);
    });

    describe('#constructor', function(){
        it('should return an instance of FileSessionHandler', function(done){
            handler.should.be.an.instanceOf(FileSessionHandler);

            done();
        });
    });

    //@covers method#read
    describe('method#write', function(){
        it('should save given data to storage', function(done){
            handler.write(sessionId, testData, function(err){
                if(err) return done(err);

                handler.read(sessionId, function(data){
                    data.should.be.equal(testData);

                    done();
                });
            })
        })
    });

    describe('method#destroy', function(){
        it('should remove given data from storage', function(done){
            handler.read(sessionId, function(data){
                data.should.be.equal(testData);

                handler.destroy(sessionId, function(){
                    handler.read(sessionId, function(data){
                        data.should.be.equal('');

                        done();
                    });
                })
            });
        })
    });

    describe('method#gc', function(){
        it('should remove all stored data from storage with age greater than given max age', function(done){
            var sessionId1 = "1";
            var sessionId2 = "2";
            var sessionId3 = "3";

            var handler1 = new FileSessionHandler(sessionStoragePath);
            var handler2 = new FileSessionHandler(sessionStoragePath);
            var handler3 = new FileSessionHandler(sessionStoragePath);

            handler1.write(sessionId1, testData, function(err){
                if(err) done(err);

                handler2.write(sessionId2, testData, function(err){
                    if(err) done(err);

                    setTimeout(function(){
                        handler3.write(sessionId3, testData, function(err){
                            if(err) done(err);

                            handler.gc(1000);

                            setTimeout(function(){
                                handler1.read(sessionId1, function(data){
                                    data.should.be.equal('');

                                    handler2.read(sessionId2, function(data){
                                        data.should.be.equal('');

                                        handler3.read(sessionId3, function(data){
                                            data.should.be.equal(testData);
                                            done();
                                        });
                                    });
                                });
                            }, 100)
                        })
                    },1500);
                });
            });
        })
    });
});