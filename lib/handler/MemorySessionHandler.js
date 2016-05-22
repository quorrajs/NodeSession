/**
 * MemorySessionHandler.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2016, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

function MemorySessionHandler(session) {
    /**
     * Object to keep all the sessions
     *
     * @type {Object}
     * @private
     */

    this.__sessions = session;
}

/**
 * Reads the session data.
 *
 * @param {String} sessionId
 * @param {function} callback
 */
MemorySessionHandler.prototype.read = function (sessionId, callback) {
    callback(this.__sessions[sessionId]||'');
};

/**
 * Writes the session data to the storage.
 *
 * @param {String} sessionId
 * @param {String} data
 * @param {function} callback
 */
MemorySessionHandler.prototype.write = function (sessionId, data, callback) {
    this.__sessions[sessionId] = data;
    callback();
};

/**
 * Destroys a session.
 *
 * @param {String} sessionId
 * @param {function} callback
 */
MemorySessionHandler.prototype.destroy = function (sessionId, callback) {
    delete this.__sessions[sessionId];
    if (callback) {
        callback()
    }
};

module.exports = MemorySessionHandler;