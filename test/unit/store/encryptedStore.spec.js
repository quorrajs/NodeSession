/**
 * encryptedStore.spec.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */
var Store = require('../../../lib/store/Store');
var EncryptedStore = require('../../../lib/store/EncryptedStore');
var FileSessionHandler = require('../../../lib/handler/FileSessionHandler');

describe('EncryptedStore', function(){
    var sessionStoragePath ='./test/sessions';
    var value = "data to store";
    var handler =  new FileSessionHandler(sessionStoragePath);
    var encryptedStore = new EncryptedStore('node_session', handler, null, 'sdhfjasdfasjdhfjhsajdhfjhasdfsdksdf');

    describe('#constructor', function(){
        it('Should be an instance of EncryptedStore and Store', function(done){
            encryptedStore.should.be.an.instanceOf(EncryptedStore);
            encryptedStore.should.be.an.instanceOf(Store);
            done();
        });
    });

    describe('method#__prepareForStorage', function(){
        it('should encrypt and return given data', function(done){
            encryptedStore.__prepareForStorage(value).should.not.eql(value);
            done();
        })
    });

    describe('method#__prepareForParse', function(){
        it('should decrypt and return given data', function(done){
            encryptedStore.__prepareForParse(encryptedStore.__prepareForStorage(value)).should.eql(value);
            done();
        })
    })
});
