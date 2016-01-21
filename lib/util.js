/**
 * util.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var proxyaddr = require('proxy-addr');

var util = {};

/**
 * Define a object key by dot notation
 *
 * @param {Object} obj
 * @param {String} name
 */
util.defineMember = function (obj, name) {
    var nameSplit = name.split('.');
    var i;
    var exists = obj;

    for (i = 0; i < nameSplit.length - 1; i++) {
        if (!exists.hasOwnProperty(nameSplit[i]) || typeof exists[nameSplit[i]] !== 'object') {
            exists[nameSplit[i]] = {};
        }
        exists = exists[nameSplit[i]]
    }
};

/**
 * Compile "proxy trust" value to function.
 *
 * @param  {Boolean|String|Number|Array|Function} val
 * @return {Function}
 */

util.compileTrust = function(val) {
    if (typeof val === 'function') return val;

    if (val === true) {
        // Support plain true/false
        return function(){ return true };
    }

    if (typeof val === 'number') {
        // Support trusting hop count
        return function(a, i){ return i < val };
    }

    if (typeof val === 'string') {
        // Support comma-separated values
        val = val.split(/ *, */);
    }

    return proxyaddr.compile(val || []);
};

module.exports = util;