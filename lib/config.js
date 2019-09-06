var _ = require('lodash');
var serviceDetails = require('./support/serviceDetails');
var env = process.env;

var config = exports;

/* Factory method */
config.create = function () {
  var config = {};
  /**
   * Static Defaults
   */
  config.schema = require('../schema');
  config.cleanupConsumers = false;
  config.autoMessageContext = true;
  config.brokerAdapter = env.MSB_BROKER_ADAPTER || 'amqp';

  /**
   * Broker Adapter Defaults
   */

  /* AMQP */
  config.amqp = {
    host: env.MSB_BROKER_HOST || '127.0.0.1',
    port: env.MSB_BROKER_PORT || 5672,
    login: env.MSB_BROKER_USER || 'guest',
    password: env.MSB_BROKER_PASS || 'guest',
    vhost: env.MSB_AMQP_VHOST || '/',
    ssl: env.MSB_BROKER_USE_SSL === 'true',
    reconnect: env.MSB_BROKER_RECONNECT === 'true',
    groupId: serviceDetails.name,
    durable: false,
    heartbeat: 10000, // In milliseconds
    prefetchCount: 1,
    autoConfirm: true,
    type: 'fanout'
  };

  config.activemq = {
    host: env.MSB_BROKER_HOST || '127.0.0.1',
    port: env.MSB_BROKER_PORT || 5673,
    username: env.MSB_BROKER_USER || 'admin',
    password: env.MSB_BROKER_PASS || 'admin',
    reconnect: env.MSB_BROKER_RECONNECT === 'true',
    receiver_options: {
      credit_window: 0, //should be defined in subscriber
      autoaccept: true, //should it be defined here?
    },
  };

  if (env.MSB_BROKER_USE_SSL === 'true') {
    config.activemq.transport = 'ssl' //or 'tls' ???
  }

  /* Local (In-process) */
  config.local = {};

  /**
   * Override default configuration
   *
   * @param  {Object} obj
   */
  config.configure = function (obj) {
    _.merge(config, obj);
  };

  /**
   * Initialize the configuration, values loaded dynamically on start
   * (Private, for testing)
   */
  config._init = function () {
    /* Override defaults from file */
    if (env.MSB_CONFIG_PATH) {
      var configPath = require('path').resolve(env.MSB_CONFIG_PATH);
      var jsonObj = require(configPath);
      delete (require.cache[configPath]);
      config.configure(jsonObj);
    }
  };

  config._init();

  /* Set any values that need to be set using the final config here */

  return config;
};
