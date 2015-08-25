var env = process.env;
var _ = require('lodash');
var config = exports;

/**
 * Static Defaults
 */
config.serviceDetails = {};
config.schema = require('../schema');
config.cleanupConsumers = false; // Should always be false for Kafka
config.autoMessageContext = true; // When needed, add: ('MSB_AUTO_MSG_CONTEXT' in env) ? env.MSB_AUTO_MSG_CONTEXT : true
config.brokerAdapter = env.MSB_BROKER_ADAPTER || 'redis';

/**
 * Broker Adapter Defaults
 */
/* Redis */
config.redis = {
  host: env.MSB_BROKER_HOST || '127.0.0.1',
  port: env.MSB_BROKER_PORT || 6379,
  options: {
    'auth_pass': env.MSB_BROKER_PASS || null
  }
};

/* AMQP */
config.amqp = {
  host: env.MSB_BROKER_HOST || '127.0.0.1',
  port: env.MSB_BROKER_PORT || 5672,
  login: env.MSB_BROKER_USER || 'guest',
  password: env.MSB_BROKER_PASS || 'guest',
  vhost: env.MSB_AMQP_VHOST || '/',
  groupId: null, // Will default to `config.serviceDetails.name`
  durable: false,
  heartbeat: 10000 // In milliseconds
};

/* Local (In-process) */
config.local = {};

/**
 * Override default configuration
 * @param  {Object} obj
 */
config.configure = function(obj) {
  _.merge(config, obj);
  config._afterConfigure();
};

/**
 * Initialize the configuration, values loaded dynamically on start
 * (Private, for testing)
 */
config._init = function() {
  /* Service details */
  var serviceDetails = config.serviceDetails;
  serviceDetails.hostname = require('os').hostname();
  serviceDetails.ip = require('ip').address();
  serviceDetails.pid = process.pid;

  var pkg = _mainPackage();
  serviceDetails.name = env.MSB_SERVICE_NAME || pkg && pkg.name;
  serviceDetails.version = env.MSB_SERVICE_VERSION || pkg && pkg.version;
  serviceDetails.instanceId = env.MSB_SERVICE_INSTANCE_ID || require('./support/generateId')();

  /* Override defaults from file */
  if (env.MSB_CONFIG_PATH) {
    var configPath = require('path').resolve(env.MSB_CONFIG_PATH);
    var jsonObj = require(configPath);
    delete(require.cache[configPath]);
    config.configure(jsonObj);
  } else {
    config._afterConfigure();
  }
};

config._afterConfigure = function() {
  if (config.amqp && !config.amqp.groupId) config.amqp.groupId = config.serviceDetails.name;
};

config._init();

/* Set any values that need to be set using the final config here */

/**
 * Return the contents of package.json as an object
 * @return {Object}
 */
function _mainPackage() {
  var pkg;
  _.find(process.mainModule && process.mainModule.paths, function(modulesPath) {
    var pathToPackage = require('path').resolve(modulesPath, '..', 'package.json');
    try {
      pkg = require(pathToPackage);
    } catch (e) {
    }
    return pkg;
  });
  return pkg;
}
