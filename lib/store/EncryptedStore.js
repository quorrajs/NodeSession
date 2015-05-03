/**
 * EncryptedStore.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var util = require('util');
var Store = require('./Store');
var Encrypter = require('encrypter');


/**
 * Create a new session instance.
 *
 * @param  {String} name
 * @param  {Object} handler
 * @param  {Object|null} encrypter
 * @param  {String} secret - key for encryption
 * @param  {String|null} id
 */
function EncryptedStore(name, handler, encrypter, secret, id) {
    EncryptedStore.super_.apply(this, arguments);

    if (!encrypter) {
        encrypter = new Encrypter(secret);
    }

    this.__encrypter = encrypter;
}

util.inherits(EncryptedStore, Store);

/**
 * Prepare the raw string data from the session for JSON parse.
 *
 * @param  {String} data
 * @return {String}
 */
EncryptedStore.prototype.__prepareForParse = function (data) {
    return this.__encrypter.decrypt(data);
};

/**
 * Prepare the JSON string session data for storage.
 *
 * @param  {String} data
 * @return {String}
 */
EncryptedStore.prototype.__prepareForStorage = function (data) {
    return this.__encrypter.encrypt(data);
};

module.exports = EncryptedStore;