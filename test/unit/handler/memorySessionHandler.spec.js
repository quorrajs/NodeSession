var MemorySessionHandler = require('../../../lib/handler/MemorySessionHandler');
var SessionManager = require('../../../lib/SessionManager');

describe('MemorySessionHandler', function(){
    var handler = new MemorySessionHandler(Object.create(null));
    var sessionId = 'testsession';
    var testData = 'testData';

    describe('#constructor', function(){
        it('should return an instance of MemorySessionHandler', function(done){
            handler.should.be.an.instanceOf(MemorySessionHandler);

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
});