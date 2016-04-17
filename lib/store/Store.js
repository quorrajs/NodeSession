/**
 * Store.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var uid = require('uid-safe').sync;
var _ = require('lodash');
var dotAccess = require('dot-access');
var util = require('./../util');

/**
 * Create a new session instance.
 *
 * @param  {String} name
 * @param  {Object} handler
 * @param  {String|null} id
 */
function Store(name, handler, id) {
    this.setId(id);
    this.__name = name;
    this.__handler = handler;

    /**
     * The session attributes.
     *
     * @var {Object}
     * @protected
     */
    this.__attributes = {};

    /**
     * Session store started status.
     *
     * @var {Boolean}
     */
    this.__started = false;
}

/**
 * Returns the session ID.
 *
 * @return {String} The session ID.
 */
Store.prototype.setId = function (id) {
    if (!this.__isValidId(id)) {
        id = this.__generateSessionId();
    }

    this.__id = id;
};

/**
 * Determine if given id is a valid session ID.
 *
 * @param  {String}  id
 * @return {Boolean}
 * @protected
 */
Store.prototype.__isValidId = function (id) {
    return typeof id === 'string' && /^[A-Za-z0-9-_]{40}$/.test(id);
};

/**
 * Get a new, random session ID.
 *
 * @return {String}
 * @protected
 */
Store.prototype.__generateSessionId = function () {
    return uid(30);
};

/**
 * Returns the session name.
 *
 * @return {String} The session name.
 */
Store.prototype.getName = function () {
    return this.__name;
};

/**
 * Starts the session storage.
 *
 * @return {Boolean} True if session started.
 * @throws Error If session fails to start.
 */
Store.prototype.start = function (callback) {
    var self = this;

    this.__loadSession(function () {
        if (!self.__attributes['_token']) {
            self.regenerateToken();
        }

        self.__started = true;

        callback();
    });
};

/**
 * Checks if an attribute is defined.
 *
 * @param {string} name The attribute name
 * @return {Boolean} true if the attribute is defined, false otherwise
 */
Store.prototype.has = function (name) {
    return this.get(name) != undefined;
};

/**
 * Load the session data from the handler.
 *
 * @param {function} callback
 * @protected
 */
Store.prototype.__loadSession = function (callback) {
    var self = this;

    this.__readFromHandler(function (data) {
        self.__attributes = _.merge(self.__attributes, data);
        callback();
    });

};

/**
 * Read the session data from the handler.
 *
 * @param {function} callback
 */
Store.prototype.__readFromHandler = function (callback) {
    var self = this;

    this.__handler.read(this.getId(), function afterRead(data) {
        if (data) {
            try {
                data = JSON.parse(self.__prepareForParse(data));
            } catch (e) {

            }
        }

        callback(data ? data : {});
    });
};

/**
 * Prepare the raw string data from the session for JSON parse.
 *
 * @param  {String} data
 * @return {String}
 */
Store.prototype.__prepareForParse = function (data) {
    return data;
};


/**
 * Returns the session ID.
 *
 * @return {String} The session ID.
 */
Store.prototype.getId = function () {
    return this.__id;
};

/**
 * Get the value of a given key and then forget it.
 *
 * @param  {String}  key
 * @param  {*}  defaultValue
 * @return {*}
 */
Store.prototype.pull = function (key, defaultValue) {
    if (defaultValue === undefined) {
        defaultValue = null;
    }

    if (this.__attributes[key]) {
        defaultValue = this.__attributes[key];
        delete this.__attributes[key]
    }

    return defaultValue;
};

/**
 * Returns an attribute.
 *
 * @param {String} name The attribute name
 * @param {*} defaultValue The default value if not found.
 *
 * @return {*}
 */
Store.prototype.get = function (name, defaultValue) {
    var value = dotAccess.get(this.__attributes, name);
    return value === undefined ? defaultValue : value;
};

/**
 * Returns attributes.
 *
 * @return {Object} Attributes
 */
Store.prototype.all = function () {
    return this.__attributes;
};

/**
 * Sets an attribute.
 *
 * @param {string} name
 * @param {*} value
 */
Store.prototype.set = function (name, value) {
    try {
        dotAccess.set(this.__attributes, name, value);
    } catch (e) {
        util.defineMember(this.__attributes, name);
        dotAccess.set(this.__attributes, name, value);
    }

};

/**
 * Regenerate the CSRF token value.
 */
Store.prototype.regenerateToken = function () {
    this.put('_token', uid(30));
};

/**
 * Put a key / value pair or Object of key / value pairs in the session.
 *
 * @param  {String|Object}  key
 * @param  {*|null}     value
 */
Store.prototype.put = function (key, value) {
    if (!_.isObject(key)) {
        var temp = {};
        temp[key] = value;
        key = temp;
    }

    var objKey;

    for (objKey in key) {
        if (key.hasOwnProperty(objKey)) {
            this.set(objKey, key[objKey])
        }
    }
};

/**
 * Push a value onto a session array.
 *
 * @param  {string}  key
 * @param  {*}   value
 */
Store.prototype.push = function (key, value) {
    var array = this.get(key, []);
    if (_.isArray(array)) {
        array.push(value);

        this.put(key, array);
    }
};

/**
 * Force the session to be saved and closed.
 * @param {function} callback
 */
Store.prototype.save = function (callback) {
    this.ageFlashData();

    var self = this;

    this.__handler.write(this.getId(), this.__prepareForStorage(JSON.stringify(this.__attributes)), function (err) {
        self.__started = false;
        callback(err);
    });
};

/**
 * Prepare the JSON string session data for storage.
 *
 * @param  {String} data
 * @return {String}
 */
Store.prototype.__prepareForStorage = function (data) {
    return data;
};

/**
 * Age the flash data for the session.
 */
Store.prototype.ageFlashData = function () {
    var self = this;

    this.get('flash.old', []).forEach(function (old) {
        self.forget(old);
    });

    this.put('flash.old', this.get('flash.new', []));

    this.put('flash.new', []);
};

/**
 * Remove an item from the session.
 *
 * @param  {string} key
 */
Store.prototype.forget = function (key) {
    delete this.__attributes[key];
};

/**
 * Remove all of the items from the session.
 */
Store.prototype.flush = function () {
    this.__attributes = {};
};

/**
 * Generate a new session identifier.
 *
 * @param  {Boolean} destroy
 * @return {Boolean}
 */
Store.prototype.regenerate = function (destroy) {
    if (destroy) {
        this.__handler.destroy(this.getId());
    }

    this.setExists(false);

    this.setId();

    return true;
};

/**
 * Set the existence of the session on the handler if applicable.
 *
 * @param  {Boolean}  value
 */
Store.prototype.setExists = function (value) {
    if (_.isFunction(this.__handler.setExists)) {
        this.__handler.setExists(value);
    }
};

/**
 * Get the underlying session handler implementation.
 */
Store.prototype.getHandler = function () {
    return this.__handler;
};

/**
 * Flash a key / value pair to the session.
 *
 * @param  {String}  key
 * @param  {*}   value
 */
Store.prototype.flash = function (key, value) {
    this.put(key, value);

    this.push('flash.new', key);

    this.__removeFromOldFlashData([key]);
};

/**
 * Flash an input array to the session.
 *
 * @param  {Array} value
 */
Store.prototype.flashInput = function(value)
{
    value = [].concat(value)
    this.flash('_old_input', value);
};

/**
 * Remove the given keys from the old flash data.
 *
 * @param  {Array}  keys
 */
Store.prototype.__removeFromOldFlashData = function (keys) {
    this.put('flash.old', _.difference(this.get('flash.old', []), keys));
};

/**
 * Re-flash all of the session flash data.
 */
Store.prototype.reflash = function () {
    this.__mergeNewFlashes(this.get('flash.old', []));

    this.put('flash.old', []);
};

/**
 * Merge new flash keys into the new flash array.
 *
 * @param  {Array}  keys
 * @protected
 */
Store.prototype.__mergeNewFlashes = function (keys) {
    var values = _.uniq((this.get('flash.new', [])).concat(keys));

    this.put('flash.new', values);
};

/**
 * Re-flash a subset of the current flash data.
 *
 * @param  {Array|*}  keys
 */
Store.prototype.keep = function (keys) {
    keys = _.isArray(keys) ? keys : Array.prototype.slice.call(arguments);

    this.__mergeNewFlashes(keys);

    this.__removeFromOldFlashData(keys);
};

/**
 * Get the CSRF token value.
 *
 * @return {String}
 */
Store.prototype.getToken = function() {
    return this.get('_token');
};

/**
 * Migrates the current session to a new session id while maintaining all
 * session attributes.
 *
 * @param {boolean} destroy  Whether to delete the old session or leave it to garbage collection.
 * @return {boolean}   True if session migrated, false if error.
 */
Store.prototype.migrate = function (destroy) {
    if (destroy) {
        this.__handler.destroy(this.getId());
    }

    this.setExists(false);
    this.setId();

    return true;
};


module.exports = Store;