/**
 * util.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

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

module.exports = util;