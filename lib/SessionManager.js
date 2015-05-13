/**
 * SessionManager.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var FileSessionHandler = require('./handler/FileSessionHandler');
var DatabaseSessionHandler = require('./handler/DatabaseSessionHandler');
var Store = require('./store/Store');
var EncryptedStore = require('./store/EncryptedStore');
var Waterline = require('waterline');
var deasync = require('deasync');
var crypto = require('crypto');

/**
 * Create a session manager instance.
 *
 * @param {Object} config
 * @param {Object} [encrypter]
 *
 * @constructor
 */
function SessionManager(config, encrypter) {
    /**
     * The configuration object
     *
     * @var Object
     * @protected
     */
    this.__config = config;

    /**
     * The registered custom driver creators.
     *
     * @var Object
     * @protected
     */
    this.__customCreators = {};

    /**
     * The encrypter instance.
     * An encrypter implements encrypt and decrypt methods.
     *
     * @var Object
     * @protected
     */
    this.__encrypter = encrypter;

    /**
     * The session database model instance
     *
     * @var Object
     * @protected
     */
    this.__sessionModel;
}

/**
 * Get the default driver name.
 *
 * @return {String}
 */
SessionManager.prototype.getDefaultDriver = function () {
    return this.__config.driver;
};
/**
 * Get a driver instance.
 *
 * @param  {string} driver
 * @return {Object}
 */
SessionManager.prototype.driver = function (driver) {
    driver = driver ? driver : this.getDefaultDriver();

    return this.__createDriver(driver);
};

/**
 * Create a new driver instance.
 *
 * @param  {String} driver
 * @return {*}
 * throws Error if specified given driver creator method doesn't exists.
 * @protected
 */
SessionManager.prototype.__createDriver = function (driver) {
    var method = '__create' + driver.charAt(0).toUpperCase() + driver.slice(1) + 'Driver';

    // We'll check to see if a creator method exists for the given driver. If not we
    // will check for a custom driver creator, which allows developers to create
    // drivers using their own customized driver creator Closure to create it.
    if (this.__customCreators[driver]) {
        return this.__callCustomCreator(driver);
    } else if (typeof this[method] === 'function') {
        return this[method]();
    }

    throw new Error("Driver " + driver + " not supported.");
};

/**
 * Call a custom driver creator.
 *
 * @param  {String} driver
 * @return {*}
 * @protected
 */
SessionManager.prototype.__callCustomCreator = function (driver) {
    return this.__customCreators[driver](this.__config);
};

/**
 * Register a custom driver creator Closure.
 *
 * @param  {String} driver
 * @param  {function} callback
 * @return {SessionManager}
 */
SessionManager.prototype.registerHandler = function(driver, callback) {
    this.__customCreators[driver] = callback;

    return this;
};

/**
 * Create an instance of the file session driver.
 *
 * @return {Object} Session driver instance
 * @protected
 */
SessionManager.prototype.__createFileDriver = function () {
    return this.__createNativeDriver();
};

/**
 * Create an instance of the file session driver.
 *
 * @return {Object} Session driver instance
 * @protected
 */
SessionManager.prototype.__createNativeDriver = function () {
    var path = this.__config.files;

    return this.__buildSession(new FileSessionHandler(path));
};


/**
 * Create an instance of the database session driver.
 *
 * @return {Object} Session driver instance
 * @protected
 */
SessionManager.prototype.__createDatabaseDriver = function () {
    var model = this.__getSessionModel();

    return this.__buildSession(new DatabaseSessionHandler(model));
};

/**
 * Get the database session table model for the database driver.
 *
 * @return {object}
 * @protected
 */
SessionManager.prototype.__getSessionModel = function () {
    if (!this.__sessionModel) {
        this.__sessionModel = this.__createSessionModel();
    }

    return this.__sessionModel;
};

/**
 * Create a waterline session model instance
 *
 * @return {Object  }
 * @protected
 */
SessionManager.prototype.__createSessionModel = function () {
    var self = this;
    var adapters = {};
    var orm = new Waterline();
    var modelReady = false;
    var SessionModel = Waterline.Collection.extend({
        identity: this.__config.table,
        connection: this.__config.table,
        migrate: 'safe',
        autoCreatedAt: false,
        autoUpdatedAt: false,
        attributes: {
            id: {
                type: 'string',
                unique: true
            },
            payload: 'string',
            lastActivity: 'integer'
        }
    });

    // Load the Models into the ORM
    orm.loadCollection(SessionModel);

    adapters[this.__config.connection.adapter] = require(this.__config.connection.adapter);

    // Tear down previous session adapter connection with same adapter.
    adapters[this.__config.connection.adapter].teardown(this.__config.table, function(){});

    var initConf = {
        adapters: adapters,
        connections:{}
    };
    initConf.connections[this.__config.table] = this.__config.connection;

    orm.initialize(initConf, function (err, models) {
        if (err) {
            throw err;
        }

        SessionModel = models.collections[self.__config.table];
        modelReady = true;
    });

    while (!modelReady) {
        deasync.runLoopOnce();
    }

    return SessionModel;
};

/**
 * Build the session instance.
 *
 * @param  handler
 * @return {Object} Session instance
 */
SessionManager.prototype.__buildSession = function (handler) {
    if (this.__config.encrypt) {
        return new EncryptedStore(
            this.__config.cookie, handler, this.__encrypter, this.__config.secret
        );
    } else {
        return new Store(this.__config.cookie, handler);
    }
};

module.exports = SessionManager;