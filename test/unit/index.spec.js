/**
 * index.spec.js.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var NodeSession = require('../../index');
var express = require('express');
var request = require('supertest');
var Store = require('../../lib/store/Store');
var FileSessionHandler = require('../../lib/handler/FileSessionHandler');
var EncryptedStore = require('../../lib/store/EncryptedStore');
var https = require('https');
var http = require('http');
var fs = require('fs');

function end(req, res) {
    res.end()
}

function shouldSetCookie(name) {
    return function (res) {
        var header = cookie(res);
        header.should.be.ok;
        header.split('=')[0].should.exactly(name);
    }
}

function shouldNotHaveHeader(header) {
    return function (res) {
        (header.toLowerCase() in res.headers).should.not.be.ok;
    }
}

function cookie(res) {
    var setCookie = res.headers['set-cookie'];
    return (setCookie && setCookie[0]) || undefined;
}

function expires(res) {
    var match = /Expires=([^;]+)/.exec(cookie(res));
    return match ? match[1] : undefined;
}

function createRequestListener(opts, fn) {
    var _session = new NodeSession(opts);
    var respond = fn || end;

    return function onRequest(req, res) {
        var server = this;

        _session.startSession(req, res, function (err) {
            if (err && !res._header) {
                res.statusCode = err.status || 500
                res.end(err.message);
                return
            }

            if (err) {
                server.emit('error', err);
                return
            }

            respond(req, res)
        })
    }
}

function createServer(opts, fn) {
    return http.createServer(createRequestListener(opts, fn))
}

describe('node-session', function(){
    before(function(){
        // clear session storage
        var f = new FileSessionHandler("./test/sessions");
        f.gc(0)
    });

    describe('#constructor', function(){
        it("should return a NodeSession instance when initialized", function(done){
            var nodeSession = new NodeSession({secret: 'jhsdfjsu899shd9hsuhdfjhdfsdhfjhsjhdf'});
            nodeSession.should.be.an.instanceOf(NodeSession);
            done();
        });

        describe('secret option', function(){
            it("should throw error when secret is not provided", function(done){
                try {
                    var nodeSession = new NodeSession();
                } catch(err) {
                    err.should.be.an.instanceOf(Error);
                    done();
                }
            });
        });
    });

    describe('#startSession', function(){
        var cookieValue;
        var secret = 'jhsdfjsu899shd9hsuhdfjhdfsdhfjhsjhdf';
        var nodeSession = new NodeSession({
            secret: secret,
            files: "./test/sessions"
        });
        var app = express()
            .use(function(req, res, next){ nodeSession.startSession(req, res, next); })
            .use('/checksession', function(req, res, next){
                res.end((req.session instanceof Store).toString());
            })
            .use('/add', function(req, res, next){
                req.session.set('clue', 'positron');
                res.send('data added!');
            })
            .use('/read', function(req, res, next){
                res.end(req.session.get('clue'));
            })
            .use(end);

        it("should attach instance of store to request as session", function(done){
            request(app)
                .get('/checksession')
                .expect('true', done);
        });

        it("should attach instance of encryptedStore to request as session when encrypt options in config is set to true",
            function(done){
                var nodeSession = new NodeSession({
                    secret: "jhsdfjsu899shd9hsuhdfjhdfsdhfjhsjhdf",
                    files: "./test/sessions",
                    encrypt: true
                });
                var app = express()
                    .use(function(req, res, next){ nodeSession.startSession(req, res, next); })
                    .use('/checksession', function(req, res, next){
                        res.end((req.session instanceof EncryptedStore).toString());
                    })
                    .use(end);

                request(app)
                    .get('/checksession')
                    .expect('true', done);
            }
        );

        it("should set signed session cookie on an http response", function(done){
            var server1 = createServer({
                    secret: secret,
                    files: "./test/sessions"
                }, function (req, res) {
                    req.session.set('user', 'bob');
                    res.end(req.session.get('user'));
                }
            );

            var server2 = createServer({
                secret: 'sjhdfjsjhdfjhjkshdjfhjkssdf',
                files: "./test/sessions"
            }, function (req, res) {
                res.end(String(req.session.get('user')));
            });

            request(server1)
                .get('/')
                .expect(shouldSetCookie('node_session'))
                .expect(200, 'bob', function (err, res) {
                    if (err) return done(err);
                    request(server2)
                        .get('/')
                        .set('Cookie', cookie(res))
                        .expect(200, 'undefined', done);
                });
        });

        it('should load session from cookie', function (done) {
            var agent = request.agent(app);

            agent.get('/add')
                .expect(200)
                .expect(shouldSetCookie('node_session'))
                .end(function(err){
                    if(err) return done(err);

                    agent.get('/read')
                        .expect(200)
                        .expect('positron', done);
                });
        });

        it('should set specified expiry in session cookie', function(done){
            request(app)
                .get('/')
                .end(function(err, res){
                    if (err) return done(err);
                    var a = new Date(expires(res));
                    var b = new Date();
                    var delta = a.valueOf() - b.valueOf();

                     cookieValue = cookie(res);

                    (delta > 290000 && delta <= 300000).should.be.ok;

                    done();
                });
        });

        it('should update expiry in subsequent request', function(done){
            request(app)
                .get('/')
                .set('Cookie', cookieValue)
                .end(function(err, res){
                    if (err) return done(err);
                    var a = new Date(expires(res));
                    var b = new Date();
                    var delta = a.valueOf() - b.valueOf();

                    (delta > 290000 && delta <= 300000).should.be.ok;

                    done();
                });
        });

        describe('when response ended', function () {
            it('should have saved session', function (done) {
                var saved = false;
                var server = createServer({
                    secret: "jhsdfjsu899shd9hsuhdfjhdfsdhfjhsjhdf",
                    files: "./test/sessions"
                }, function (req, res) {
                    req.session.set('hit', true);
                    _save = req.session.save;
                    req.session.save = function(callback){
                        setTimeout(function () {
                            _save.call(req.session, function (err) {
                                saved = true;
                                callback(err)
                            })
                        }, 200)
                    };
                    res.end('session saved')
                });

                request(server)
                    .get('/')
                    .expect(200, 'session saved', function (err) {
                        if (err) return done(err);
                        saved.should.be.ok;
                        done()
                    })
            });

            it('should have saved session even with empty response', function (done) {
                var saved = false;
                var server = createServer({
                    secret: "jhsdfjsu899shd9hsuhdfjhdfsdhfjhsjhdf",
                    files: "./test/sessions"
                }, function (req, res) {
                    req.session.set('hit', true);
                    _save = req.session.save;
                    req.session.save = function(callback){
                        setTimeout(function () {
                            _save.call(req.session, function (err) {
                                saved = true;
                                callback(err)
                            })
                        }, 200)
                    };
                    res.end();
                });

                request(server)
                    .get('/')
                    .expect(200, '', function (err) {
                        if (err) return done(err);
                        saved.should.be.ok;
                        done()
                    })
            });
        });

        describe('when sid not in store', function () {
            var count = 0;
            var handler;
            var sessionId;
            var token;
            var server = createServer({
                secret: "jhsdfjsu899shd9hsuhdfjhdfsdhfjhsjhdf",
                files: "./test/sessions"
            }, function (req, res) {
                handler = req.session.getHandler();
                sessionId = req.session.getId();
                token = req.session.getToken();
                req.session.set('num', req.session.get('num') || ++count);
                res.end('session ' + req.session.get('num'));
            });

            it('should create a new session', function (done) {
                request(server)
                    .get('/')
                    .expect(shouldSetCookie('node_session'))
                    .expect(200, 'session 1', function (err, res) {
                        if (err) return done(err);

                        handler.destroy(sessionId, function (err) {
                            if (err) return done(err);
                            request(server)
                                .get('/')
                                .set('Cookie', cookie(res))
                                .expect(200, 'session 2', done)
                        })
                    })
            });

            it('should have a new csrf token', function (done) {

                request(server)
                    .get('/')
                    .expect(shouldSetCookie('node_session'))
                    .expect(200, 'session 3', function (err, res) {
                        if (err) return done(err);
                        var val = token;
                        val.should.be.ok;
                        handler.destroy(sessionId, function (err) {
                            if (err) return done(err);
                            request(server)
                                .get('/')
                                .set('Cookie', cookie(res))
                                .expect(shouldSetCookie('node_session'))
                                .expect(200, 'session 4', function (err, res) {
                                    if (err) return done(err);
                                    val.should.not.eql(token);
                                    done()
                                })
                        })
                    })
            })
        });

        describe('driver option', function(){
            it("should throw error when invalid driver is provided", function(done){
                var nodeSession = new NodeSession({
                    secret: 'jhsdfjsu899shd9hsuhdfjhdfsdhfjhsjhdf',
                    driver: 'wresfvs'
                });
                var app = express()
                    .use(function(req, res, next){ nodeSession.startSession(req, res, next); })
                    .use(function(err, req, res, next){
                        err.should.be.an.instanceOf(Error);
                        done();
                    })
                    .use(end);

                request(app)
                    .get('/')
                    .end();
            });
        });

        describe('expireOnClose option', function(){
            describe('when disabled', function(){
                var nodeSession = new NodeSession({
                    secret: "jhsdfjsu899shd9hsuhdfjhdfsdhfjhsjhdf",
                    files: "./test/sessions",
                    expireOnClose: false
                });
                var app = express()
                    .use(function(req, res, next){ nodeSession.startSession(req, res, next); })
                    .use(end);

                it('should set expiry on cookie', function(done){
                    request(app)
                        .get('/')
                        .end(function(err, res){
                            if (err) return done(err);
                            expires(res).should.be.ok;
                            done();
                        })
                });
            });

            describe('when enabled', function(){
                var nodeSession = new NodeSession({
                    secret: "jhsdfjsu899shd9hsuhdfjhdfsdhfjhsjhdf",
                    files: "./test/sessions",
                    expireOnClose: true
                });
                var app = express()
                    .use(function(req, res, next){ nodeSession.startSession(req, res, next); })
                    .use(end);

                it('should not set expiry on cookie', function(done){
                    request(app)
                        .get('/')
                        .end(function(err, res){
                            if (err) return done(err);
                            (expires(res) === undefined).should.be.ok;
                            done();
                        })
                });
            });
        });

        describe('secure option', function(){
            describe('when enabled', function(){
                it('should sent cookies via secure connection', function(done){
                    var app = createRequestListener({
                        secret: 'jhsdfjsu899shd9hsuhdfjhdfsdhfjhsjhdf',
                        files: "./test/sessions",
                        secure: true
                    });

                    var cert = fs.readFileSync(__dirname + '/../fixtures/server.crt', 'ascii');
                    var server = https.createServer({
                        key: fs.readFileSync(__dirname + '/../fixtures/server.key', 'ascii'),
                        cert: cert
                    });

                    server.on('request', app);

                    var agent = new https.Agent({ca: cert});
                    var createConnection = agent.createConnection;

                    agent.createConnection = function (options) {
                        options.servername = 'express-session.local';
                        return createConnection.call(this, options)
                    };

                    request(server).get('/')
                        .agent(agent)
                        .expect(shouldSetCookie('node_session'))
                        .expect(200, done)
                });

                describe('trustProxy option', function(){
                    describe('when disabled', function(){

                        var nodeSession = new NodeSession({
                            secret: "jhsdfjsu899shd9hsuhdfjhdfsdhfjhsjhdf",
                            files: "./test/sessions",
                            secure: true
                        });
                        var app = express()
                            .use(function(req, res, next){ nodeSession.startSession(req, res, next); })
                            .use(end);

                        it('should not sent cookies via insecure connection', function(done){
                            request(app)
                                .get('/')
                                .expect(shouldNotHaveHeader('set-cookie'))
                                .end(function(err){
                                    if (err) return done(err);

                                    done();
                                });
                        });

                        it('should not trust when no X-Forwarded-Proto header', function(done){
                            request(app)
                                .get('/')
                                .expect(shouldNotHaveHeader('Set-Cookie'))
                                .expect(200, done)
                        })
                    });

                    describe('when enabled', function(){
                        var nodeSession = new NodeSession({
                            secret: "jhsdfjsu899shd9hsuhdfjhdfsdhfjhsjhdf",
                            files: "./test/sessions",
                            secure: true,
                            trustProxy: true
                        });
                        var app = express()
                            .use(function(req, res, next){ nodeSession.startSession(req, res, next); })
                            .use(end);

                        it('should trust X-Forwarded-Proto when string', function(done){
                            request(app)
                                .get('/')
                                .set('x-forwarded-proto', 'https')
                                .expect(shouldSetCookie('node_session'))
                                .end(function(err){
                                    if (err) return done(err);

                                    done();
                                });
                        });

                        it('should trust X-Forwarded-Proto when comma-separated list', function(done){
                            request(app)
                                .get('/')
                                .set('X-Forwarded-Proto', 'https,http')
                                .expect(shouldSetCookie('node_session'))
                                .expect(200, done)
                        });

                        it('should not trust when no X-Forwarded-Proto header', function(done){
                            request(app)
                                .get('/')
                                .expect(shouldNotHaveHeader('Set-Cookie'))
                                .expect(200, done)
                        });
                    });
                });
            });
        });

    });

    describe('#getSession', function(){
        it('should return an instance of session store for given request', function(){
            var nodeSession = new NodeSession({
                secret: "jhsdfjsu899shd9hsuhdfjhdfsdhfjhsjhdf",
                files: "./test/sessions"
            });
            var app = express()
                .use(function(req, res, next){
                    it("should return an instance of session store for the given request", function(done){
                       nodeSession.getSession(req).should.be.an.instanceOf(Store);
                        done();
                    });
                })
                .use(end);

            request(app)
                .get('/')
                .end();
        })
    });
});