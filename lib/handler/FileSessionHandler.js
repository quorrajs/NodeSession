/**
 * FileSessionHandler.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var fs = require('fs');
var path = require('path');

function FileSessionHandler(path) {
    /**
     * The path where sessions should be stored.
     *
     * @type {String}
     */
    this.__path = path;
}

/**
 * Reads the session data.
 *
 * @param {String} sessionId
 * @param {function} callback
 *
 * @return {String} Same session data as passed in write() or empty string when non-existent or on failure
 */
FileSessionHandler.prototype.read = function (sessionId, callback) {
    fs.readFile(path.normalize(path.join(this.__path, sessionId)), 'utf-8', function (err, file) {
        if (err) {
            file = '';
        }
        if (callback) {
            callback(file);
        }
    });
};

/**
 * Writes the session data to the storage.
 *
 * @param {String} sessionId
 * @param {String} data
 * @param {function} callback
 *
 * @return {Boolean} true on success, false on failure
 */
FileSessionHandler.prototype.write = function (sessionId, data, callback) {
	if(!fs.existsSync(this.__path)){
        fs.mkdirSync(this.__path);
    }
    fs.writeFile(path.normalize(path.join(this.__path, sessionId)), data, 'utf-8', function (err) {
        if (callback) {
            callback(err);
        }
    });
};

/**
 * Destroys a session.
 *
 * @param {String} sessionId
 * @param {function} callback
 *
 * @return {Boolean} true on success, false on failure
 */
FileSessionHandler.prototype.destroy = function (sessionId, callback) {
    fs.unlink(path.join(this.__path, sessionId), function (err) {
        if (callback) {
            callback(err)
        }
    })
};

/**
 * Cleans up expired sessions (garbage collection).
 *
 * @param {String|number} maxAge Sessions that have not updated for the last maxAge seconds will be removed
 *
 * @return {Boolean} true on success, false on failure
 */
FileSessionHandler.prototype.gc = function (maxAge) {
    var self = this;

    fs.readdir(self.__path, function (err, files) {
        if (err || files.length === 0) {
            return;
        }
        files.forEach(function (file) {
            if (file[0] != '.') {
                fs.stat(path.join(self.__path, file), function (err, stat) {
                    if (!err) {
                        if (stat.isFile() && ((new Date()).getTime() - stat.atime.getTime() > maxAge)) {
                            self.destroy(file);
                        }
                    }
                });
            }
        });
    });
};

module.exports = FileSessionHandler;