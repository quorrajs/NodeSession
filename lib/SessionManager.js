/**
 * SessionManager.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var FileSessionHandler = require('./handler/FileSessionHandler');
var MemorySessionHandler = require('./handler/MemorySessionHandler');
var DatabaseSessionHandler = require('./handler/DatabaseSessionHandler');
var Store = require('./store/Store');
var EncryptedStore = require('./store/EncryptedStore');
var Waterline = require('waterline');

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

    /**
     * The memory session handler storage
     * @type {null}
     * @protected
     */
    this.__memorySession = Object.create(null);
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
 * @param {function} callback
 */
SessionManager.prototype.driver = function (driver, callback) {
    driver = driver ? driver : this.getDefaultDriver();

    this.__createDriver(driver, callback);
};

/**
 * Create a new driver instance.
 *
 * @param  {String} driver
 * @param  {function} callback
 * throws Error if specified given driver creator method doesn't exists.
 * @protected
 */
SessionManager.prototype.__createDriver = function (driver, callback) {
    var method = '__create' + driver.charAt(0).toUpperCase() + driver.slice(1) + 'Driver';

    // We'll check to see if a creator method exists for the given driver. If not we
    // will check for a custom driver creator, which allows developers to create
    // drivers using their own customized driver creator Closure to create it.
    if (this.__customCreators[driver]) {
        return this.__callCustomCreator(driver, callback);
    } else if (typeof this[method] === 'function') {
        return this[method](callback);
    }

    throw new Error("Driver " + driver + " not supported.");
};

/**
 * Call a custom driver creator.
 *
 * @param  {String} driver
 * @param  {function} callback
 * @protected
 */
SessionManager.prototype.__callCustomCreator = function (driver, callback) {
    this.__customCreators[driver](this.__config, callback);
};

/**
 * Register a custom driver creator Closure.
 *
 * @param  {String} driver
 * @param  {function} handler
 * @return {SessionManager}
 */
SessionManager.prototype.registerHandler = function(driver, handler) {
    this.__customCreators[driver] = handler;

    return this;
};

/**
 * Create an instance of the memory session driver.
 *
 * @param {function} callback to return session driver instance
 * @protected
 */
SessionManager.prototype.__createMemoryDriver = function (callback) {
    callback(this.__buildSession(new MemorySessionHandler(this.__memorySession)));
};

/**
 * Create an instance of the file session driver.
 *
 * @param {function} callback to return session driver instance
 * @protected
 */
SessionManager.prototype.__createFileDriver = function (callback) {
    return this.__createNativeDriver(callback);
};

/**
 * Create an instance of the file session driver.
 *
 * @param {function} callback to return session driver instance
 * @protected
 */
SessionManager.prototype.__createNativeDriver = function (callback) {
    var path = this.__config.files;

    callback(this.__buildSession(new FileSessionHandler(path)));
};


/**
 * Create an instance of the database session driver.
 *
 * @return {Object} Session driver instance
 * @protected
 */
SessionManager.prototype.__createDatabaseDriver = function (callback) {
    var self = this;

    this.__getSessionModel(function(model) {
        callback(self.__buildSession(new DatabaseSessionHandler(model)))
    });
};

/**
 * Get the database session table model for the database driver.
 *
 * @param {function} callback
 * @protected
 */
SessionManager.prototype.__getSessionModel = function (callback) {
    if (!this.__sessionModel) {
        var self = this;
        this.__createSessionModel(function(model) {
            self.__sessionModel = model;
            callback(self.__sessionModel);
        });
    } else {
        callback(this.__sessionModel)
    }
};

/**
 * Create a waterline session model instance
 *
 * @param {function} callback
 * @protected
 */
SessionManager.prototype.__createSessionModel = function (callback) {
    var self = this;
    var adapters = {};
    var orm = new Waterline();
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
        callback(SessionModel);
    });
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

/**
 * Update session encrypter service.
 *
 * @param {Object} encrypter
 */
SessionManager.prototype.setEncrypter = function (encrypter) {
    this.__encrypter = encrypter;
};

module.exports = SessionManager;