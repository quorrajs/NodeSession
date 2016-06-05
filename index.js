/**
 * index.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var SessionManager = require('./lib/SessionManager');
var onHeaders = require('on-headers');
var _ = require('lodash');
var signature = require('cookie-signature');
var cookie = require('cookie');
var util = require('./lib/util');

/**
 * Create a new NodeSession instance
 *
 * @param {Object} config - session configuration object
 * @param {Object | void} encrypter
 * @constructor
 */
function NodeSession(config, encrypter) {
    var defaults = {
        'driver': 'file',
        'lifetime': 300000, // five minutes
        'expireOnClose': false,
        'files': process.cwd()+'/sessions',
        'connection': false,
        'table': 'sessions',
        'lottery': [2, 100],
        'cookie': 'node_session',
        'path': '/',
        'domain': null,
        'secure': false,
        'httpOnly': true,
        'encrypt': false
    };

    /**
     * The Session configuration
     *
     * @type {Object}
     * @private
     */
    this.__config = _.merge(defaults, config);

    if(this.__config.trustProxy && !this.__config.trustProxyFn) {
        this.__config.trustProxyFn = util.compileTrust(this.__config.trustProxy)
    }

    /**
     * The session manager instance
     * @type {SessionManager}
     * @private
     */
    this.__manager = new SessionManager(this.__config, encrypter);

    if (!this.__config.secret) {
        throw new Error('secret option required for sessions');
    }
}

/**
 * Start session for a given http request - response
 *
 * @param {Object} request - http request object
 * @param {Object} response - http response object
 * @param {function} callback
 */
NodeSession.prototype.startSession = function (request, response, callback) {
    var self = this;
    var end = response.end;
    var ended = false;

    // Set cookie to response headers before headers are sent
    onHeaders(response, function () {
        self.__addCookieToResponse(request, response);
    });

    // Proxy response.end to close session before request end
    response.end = function () {
        var endArguments = arguments;

        if (ended) {
            return false;
        }

        ended = true;

        self.__closeSession(request.session, function (err) {
            if(err) {
                throw err;
            }
            end.apply(response, endArguments);
        });

    };

    // start the session for the request
    this.__startSession(request, callback);
};

/**
 * Start the session for the given request.
 *
 * @param {Object} request - http request object
 * @param {function} callback
 * @private
 */
NodeSession.prototype.__startSession = function (request, callback) {
    this.getSession(request, function(session) {
        request.session = session;

        session.start(callback);
    });
};

/**
 * Get the session implementation from the manager.
 *
 * @param {Object} request - http request object
 * @param {function} callback - callback to return session object
 */
NodeSession.prototype.getSession = function (request, callback) {
    var self = this;
    this.__manager.driver(null, function(session){
        session.setId(self.__getCookie(request, session.getName()));

        callback(session);
    });
};

/**
 * Add the session cookie to the application response.
 *
 * @param {Object} request - http request object
 * @param {Object} response - http response object
 * @private
 */
NodeSession.prototype.__addCookieToResponse = function (request, response) {
    var config = this.__config;
    var session = request.session;
    var maxAge = this.__getCookieLifetime();
    var data = {
        signed: true,
        path: config.path,
        domain: config.domain,
        secure: config.secure,
        httpOnly: config.httpOnly
    };

    // maxAge = 0 => cookie expire on browser close.
    // so no need to set maxAge.
    if (maxAge !== 0) {
        data.maxAge = maxAge;
    }

    this.__setCookie(
        request,
        response,
        session.getName(),
        session.getId(),
        data
    );
};

/**
 * Get the cookie lifetime in seconds.
 *
 * @return {Number}
 * @private
 */
NodeSession.prototype.__getCookieLifetime = function () {
    var config = this.__config;

    return config.expireOnClose ? 0 : config.lifetime;
};

/**
 * Closes the given session.
 *
 * @param {Object} session - the session object
 * @param {function} callback
 * @private
 */
NodeSession.prototype.__closeSession = function (session, callback) {
    session.save(callback);
    //@todo: note callback is executed after save, not waiting for garbage collection to complete
    this.__collectGarbage(session);
};

/**
 * Remove the garbage from the session if necessary.
 *
 * @param {Object} session - the session object
 * @private
 */
NodeSession.prototype.__collectGarbage = function (session) {
    // Here we will see if this request hits the garbage collection lottery by hitting
    // the odds needed to perform garbage collection on any given request. If we do
    // hit it, we'll call this handler to let it delete all the expired sessions.
    if (this.__configHitsLottery()) {
        session.getHandler().gc && session.getHandler().gc(this.__config.lifetime);
    }
};

/**
 * Determine if the configuration odds hit the lottery.
 *
 * @return {Boolean}
 * @private
 */
NodeSession.prototype.__configHitsLottery = function () {
    return (_.random(1, this.__config['lottery'][1]) <= this.__config['lottery'][0]);
};

/**
 * Add session cookie to response
 *
 * @param {Object} request - http request object
 * @param {Object} response - http response object
 * @param {String} name - cookie name
 * @param {*} val - cookie value
 * @param {*} options
 * @private
 */
NodeSession.prototype.__setCookie = function (request, response, name, val, options) {
    options = _.merge({}, options);

    // only send secure cookies via https
    if (!(options.secure && !this.__isSecure(request))) {
        var secret = this.__config.secret;
        var signed = options.signed;

        if (signed && !secret) {
            throw new Error('An encryption key is required for signed cookies');
        }

        if ('number' == typeof val) {
            val = val.toString();
        }

        if ('object' == typeof val) {
            val = 'j:' + JSON.stringify(val);
        }

        if (signed) {
            val = 's:' + signature.sign(val, secret);
        }

        if ('maxAge' in options) {
            options.expires = new Date(Date.now() + options.maxAge);
            options.maxAge /= 1000;
        }

        if (null == options.path) {
            options.path = '/';
        }

        var headerVal = cookie.serialize(name, String(val), options);

        // supports multiple 'setCookie' calls by getting previous value
        var prev = response.getHeader('set-cookie') || [];
        var header = Array.isArray(prev) ? prev.concat(headerVal)
            : Array.isArray(headerVal) ? [prev].concat(headerVal)
            : [prev, headerVal];

        response.setHeader('set-cookie', header);
    }
};

/**
 * Check whether request is secure
 *
 * @param {Object} request - http request object
 * @return {boolean}
 * @private
 */
NodeSession.prototype.__isSecure = function (request) {
    var proto;

    // socket is https server
    if (request.connection && request.connection.encrypted) {
        proto = 'https'
    } else {
        proto = 'http';
    }

    if (this.__config.trustProxy &&
        this.__config.trustProxyFn &&
        this.__config.trustProxyFn(request.connection.remoteAddress, 0)) {
        // Note: X-Forwarded-Proto is normally only ever a
        //       single value, but this is to be safe.
        // read the proto from x-forwarded-proto header
        var header = request.headers['x-forwarded-proto'] || '';
        var index = header.indexOf(',');
        proto = (index !== -1
            ? header.substr(0, index).toLowerCase().trim()
            : header.toLowerCase().trim()) || proto;
    }

    return proto === 'https';
};

/**
 * Get the session ID cookie from request.
 *
 * @return {string} session id
 * @private
 */
NodeSession.prototype.__getCookie = function (request, name) {
    // if signed cookie is already present in request(means cookie
    // parsing is already done), we will use it straight.
    if (request.signedCookies) {
        return request.signedCookies[name];
    }

    var header = request.headers.cookie;
    var raw;
    var val;

    // read from cookie header
    if (header) {
        var cookies = cookie.parse(header);

        raw = cookies[name];

        if (raw) {
            if (raw.substr(0, 2) === 's:') {
                val = this.__unsignCookie(raw.slice(2));

                if (val === false) {
                    //console.error('cookie signature invalid');
                    val = undefined;
                }
            }
        }
    }

    return val;
};

/**
 * Unsign a cookie value
 *
 * @param {String} val
 * @returns {String|Boolean}
 * @private
 */
NodeSession.prototype.__unsignCookie = function (val) {
    return signature.unsign(val, this.__config.secret);
};

/**
 * Update session manager encrypter service.
 *
 * @param {Object} encrypter
 */
NodeSession.prototype.setEncrypter = function (encrypter) {
    this.__manager.setEncrypter(encrypter);
};


module.exports = NodeSession;