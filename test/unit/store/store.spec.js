/**
 * store.spec.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var Store = require('../../../lib/store/Store');
var FileSessionHandler = require('../../../lib/handler/FileSessionHandler');
var DatabaseSessionHandler = require('../../../lib/handler/DatabaseSessionHandler');
var SessionManager = require('../../../lib/SessionManager');

var fs = require('fs');
var should = require('should');
var sinon = require('sinon');

var sessionStoragePath ='./test/sessions';
var handler =  new FileSessionHandler(sessionStoragePath);

var fixtureSessionId = '6nZA4-UavYvomaz5oBUyBpQ9d2KynAqb4FUKdkRx';

describe('Store', function(){
    before(function(){
        // clear session storage
        var f = new FileSessionHandler(sessionStoragePath);
        f.gc(0)
    });

    var name = 'node_session';
    var store = new Store(name, handler);
    var value = 'do you know what is clu?';
    var tempObject = {
        a: 'b',
        b: {
            c: 'd'
        },
        c: 'd'
    };

    describe('#constructor', function(){
        it('should return an instance of Store when initialized', function(done){
            store.should.be.an.instanceOf(Store);

            done();
        })
    });

    /**
     * @covers getId
     */
    describe('method#setId', function(){
        it('should set session id when given id is valid', function(done){
            store.setId(fixtureSessionId);
            store.getId().should.be.equal(fixtureSessionId);

            done();
        });

        it('should generate new session id when given id is invalid', function(done){
            var invalidId = '&*^&*%6hjsd';

            store.setId('&*^&*%6hjsd');
            store.getId().should.not.be.equal(invalidId);

            done();
        })
    });

    describe('method#getName', function(){
        it('should return session name', function(done){
            store.getName().should.be.equal(name);

            done();
        });
    });

    describe('method#start', function(){
        describe('when session does not exists in storage', function(){
            it('should create new session and return callback', function(done){
                var store = new Store(name, handler);

                fs.existsSync(sessionStoragePath+'/'+store.getId()).should.not.be.ok;

                store.all().should.be.empty;

                store.start(function(){
                    store.all().should.not.be.empty;

                    done();
                });

            })
        });

        describe('when session exists in storage', function(){
            it('should load session from storage and return callback', function(done){
                // copy fixture session to session storage
                var rd = fs.createReadStream('./test/fixtures/'+fixtureSessionId);
                var wr = fs.createWriteStream(sessionStoragePath+'/'+fixtureSessionId);

                rd.on('close', function(){
                    var store = new Store(name, handler, fixtureSessionId);

                    fs.existsSync(sessionStoragePath+'/'+store.getId()).should.be.ok;

                    store.all().should.be.empty;

                    fs.readFile(sessionStoragePath+'/'+store.getId(), function(err, data){
                        data = JSON.parse(data);

                        store.start(function(){
                            store.all().should.not.be.empty;
                            store.all().should.be.eql(data);

                            done();
                        });
                    });
                });

                rd.pipe(wr);
            })
        });
    });

    describe('method#has', function(){
        it('should return false when given session key doesn\'t exist', function(done){
           store.has('clu').should.not.be.ok;

            done();
        });

        it('should return true when given session key exist', function(done){
            store.set('clu', value);

            store.has('clu').should.be.ok;

            done();
        });

        it('should return true when given session key in dot notation exist', function(done){
            store.set('vehicle', {car: 'maserati'});

            store.has('vehicle.car').should.be.ok;

            done();
        });
    });

    describe('method#pull', function(){

        it('should return session value for given key and forget the key', function(done){
            store.set('clu', value);

            store.pull('clu').should.equal(value);

            should(store.pull('clu')).not.be.ok;

            done();
        });

        it('should return null if key doesn\'t exist', function(done){

            should(store.pull('clu')).equal(null);

            done();
        });

        it('should return given default value if key doens\'t exist in session', function(done){

            store.pull('clu', value).should.equal(value);

            done();
        });
    });

    describe('method#get', function(){
        it('should return session value for given key', function(done){
            store.set('clu', value);

            store.get('clu').should.equal(value);

            done();
        });

        it('should return undefined if session value for given key don\'t exist', function(done){
            store.flush();

            should(store.get('clu')).be.undefined;

            done();
        });

        it('should return given default value if session value for given key don\'t exist', function(done){
            store.flush();

            store.get('clu', value).should.be.equal(value);

            done();
        });
    });

    describe('method#all', function(){
        it('should return all user attributes from session', function(done){

            store.flush();

            store.set('a', tempObject.a);
            store.set('b', tempObject.b);
            store.set('c', tempObject.c);

            store.all().should.be.eql(tempObject);

            done();
        });
    });

    describe('method#set', function(){
        it('should set a session value for given key', function(done){
            store.flush();

            store.set('clu', value);

            store.get('clu').should.be.equal(value);

            done();
        });

        it('should set a session value for given key in dot notation', function(done){

            store.flush();

            store.set('vehicle.car', 'maserati');

            store.get('vehicle.car').should.be.equal('maserati');

            done();
        });
    });

    describe('method#regenerateToken', function(){
        it('should regenerate csrf token', function(done){
            var token = store.getToken();

            store.regenerateToken();

            store.getToken().should.not.eql(token);

            done();
        });
    });

    describe('method#put', function(){
        it('should set a session value by given key', function(done){
            store.flush();

            store.put('clu', value);

            store.get('clu').should.equal(value);

            done();
        });

        it('should put an Object of key / value pairs in to the store', function(done){
            store.flush();

            store.put(tempObject);

            store.get('a').should.be.eql(tempObject.a);
            store.get('b').should.be.eql(tempObject.b);
            store.get('c').should.be.eql(tempObject.c);

            done();
        });
    });

    describe('method#push', function(){
        it('should push a value to a array exists in store by given key', function(done){
            store.flush();

            store.set('vehicle', []);

            store.push('vehicle', 'car');
            store.push('vehicle', 'bus');

            store.get('vehicle').should.be.eql(['car', 'bus']);
            done();
        });

        it('should do nothing if value is given to push to a non array in store', function(done){
            store.flush();

            store.set('vehicle', 'car');

            store.push('vehicle', 'car');
            store.push('vehicle', 'bus');

            store.get('vehicle').should.not.eql(['car', 'bus']);
            done();
        });
    });

    describe('method#save', function(){
        var handler =  new FileSessionHandler(sessionStoragePath);
        var store = new Store('node_session', handler);

        it('should call ageFlashData method', function(done){
            sinon.spy(store, 'ageFlashData');

            store.save(function(){
                store.ageFlashData.calledOnce.should.be.ok;

                done();
            })
        });

        it('should call handlers write method with session id, json session data and return callback', function(done){
            sinon.spy(handler, 'write');

            var data  = store.all();

            store.save(function(){
                handler.write.calledOnce.should.be.ok;

                var spyCall;
                spyCall = handler.write.getCall(0);
                spyCall.args[0].should.be.equal(store.getId());
                spyCall.args[1].should.be.eql(JSON.stringify(store.all()));
                spyCall.args[2].should.be.a.function;

                done();
            });
        });
    });

    describe('method#ageFlashData', function(){
        store.flush();

        describe('old flash data', function(){
            var store = new Store('node_session', handler);

            it('should be undefined/empty before calling ageFlashData method', function(done){
                store.get('flash.old', []).should.be.empty;
                done();
            });
        });

        it('should assign new flash data to old flash data and set new flash data to empty', function(done){
            store.flash('clu', value);

            var newFlash = store.get('flash.new');

            newFlash.should.not.be.empty;

            var oldFlash = store.get('flash.old');

            store.ageFlashData();

            oldFlash.forEach(function(val){
                store.get(val, null).should.be.empty;
            });

            store.get('flash.old').should.eql(newFlash);

            store.get('flash.new').should.be.empty;

            done();
        });
    });

    describe('method#forget', function(){
        it('should remove an item from store', function(done){
            store.set('clu', value);

            store.forget('clu');

            should(store.get('clu')).be.undefined;

            done();
        });
    });

    describe('method#flush', function(){
       it('should delete all items from store', function(done){
           store.set('clu', value);

           store.flush();

           store.all().should.be.empty;

           done();
       });
    });

    describe('method#regenerate', function(){
        it('should call setExists and setId methods and return true', function(done){
            var handler =  new FileSessionHandler(sessionStoragePath);
            var store = new Store('node_session', handler);
            sinon.spy(store, 'setExists');
            sinon.spy(store, 'setId');

            store.regenerate();

            store.setExists.calledOnce.should.be.ok;
            store.setId.calledOnce.should.be.ok;

            done();
        });

        it('should call destroy method of handler with session id if called with argument destroy as true',
            function(done){
                var handler =  new FileSessionHandler(sessionStoragePath);
                var store = new Store('node_session', handler);

                sinon.spy(handler, 'destroy');

                store.regenerate(true);

                handler.destroy.calledOnce.should.be.ok;

                done();
            }
        );
    });

    describe('method#setExists', function(){
        it('should call method setExists of handler if it exists', function(done){
            var handler =  new FileSessionHandler(sessionStoragePath);
            var store = new Store('node_session', handler);

            // handler do not have setExists method

            should(store.setExists(true)).not.throw();

            (new SessionManager({table: 'session', connection: { adapter: 'sails-disk'}})).__getSessionModel(function(sessionModel) {
                handler =  new DatabaseSessionHandler(sessionModel);
                store = new Store('node_session', handler);

                sinon.spy(handler, 'setExists');

                store.setExists(true);

                handler.setExists.calledOnce.should.be.ok;

                done();
            });
        });
    });

    describe('method#getHandler', function(){
        it('should return handler instance', function(done){
            store.getHandler().should.equal(handler);

            done();
        });
    });

    describe('method#flash', function(){
        it('should add given item to store, add given key to new flash data and remove given key from old flash data',
            function(done){
                store.flush();
                store.flash('clu', value);
                store.ageFlashData();

                store.get('flash.old').should.eql(['clu']);

                store.flash('clu', value);
                store.get('clu').should.equal(value);
                store.get('flash.new').should.eql(['clu']);
                store.get('flash.old', []).should.be.empty;

                done();
            }
        );
    });

    describe('method#reflash', function(){
        it('should move all keys from old flash to new flash', function(done){
            store.flush();
            store.flash('clu', value);
            store.ageFlashData();

            store.get('flash.old').should.eql(['clu']);
            store.get('flash.new', []).should.be.empty;
            store.reflash();
            store.get('flash.old', []).should.be.empty;
            store.get('flash.new').should.eql(['clu']);
            done();
        });
    });

    describe('method#keep', function(){
        it('should re-flash specified key', function(done){
            store.flush();
            store.flash('a', value);
            store.flash('b', value);
            store.flash('c', value);
            store.ageFlashData();

            store.get('flash.old').should.eql(['a', 'b', 'c']);
            store.get('flash.new', []).should.be.empty;
            store.keep('a');
            store.get('flash.old').should.eql(['b', 'c']);
            store.get('flash.new').should.eql(['a']);
            done();
        });

        it('should re-flash specified list of keys', function(done){
            store.flush();
            store.flash('a', value);
            store.flash('b', value);
            store.flash('c', value);
            store.ageFlashData();

            store.get('flash.old').should.eql(['a', 'b', 'c']);
            store.get('flash.new', []).should.be.empty;
            store.keep('a', 'c');
            store.get('flash.old').should.eql(['b']);
            store.get('flash.new').should.eql(['a', 'c']);
            done();
        });
    });

    describe('method#getToken', function(){
        it('should return _token from store', function(done){
            store.start(function(){
                store.getToken().should.be.equal(store.get('_token'));

                done();
            });
        });
    });

    describe('method#migrate', function () {
        it('should migrate session without calling destroy when force migrate attribute is not set', function (done) {
            var handler =  new FileSessionHandler(sessionStoragePath);
            var store = new Store('node_session', handler);
            var oldId = store.getId();

            sinon.spy(handler, 'destroy');
            store.migrate();
            handler.destroy.notCalled.should.be.ok;
            oldId.should.not.be.equal(store.getId());

            done();
        });

        it('should migrate session with calling destroy method with sessionid as argument when force migrate attribute' +
        ' is set to true', function (done) {
            var handler =  new FileSessionHandler(sessionStoragePath);
            var store = new Store('node_session', handler);
            var oldId = store.getId();

            sinon.spy(handler, 'destroy');
            store.migrate(true);
            handler.destroy.calledWith(oldId).should.be.ok;
            oldId.should.not.be.equal(store.getId());

            done();
        });
    });
});
