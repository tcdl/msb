var _ = require('lodash');
var serviceDetails = require('./support/serviceDetails');
var env = process.env;

var config = exports;

/* Factory method */
config.create = function() {
  var config = {};
  /**
   * Static Defaults
   */
  config.schema = require('../schema');
  config.cleanupConsumers = false;
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
    groupId: serviceDetails.name,
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
  };

  /**
   * Initialize the configuration, values loaded dynamically on start
   * (Private, for testing)
   */
  config._init = function() {
    /* Override defaults from file */
    if (env.MSB_CONFIG_PATH) {
      var configPath = require('path').resolve(env.MSB_CONFIG_PATH);
      var jsonObj = require(configPath);
      delete(require.cache[configPath]);
      config.configure(jsonObj);
    }
  };

  config._init();

/* Set any values that need to be set using the final config here */

  return config;
};
