var path = require('path');
var _ = require('lodash');
var generateId = require('./support/generateId');
var pkg = _mainPackage();
var config = exports;

/* Defaults */
config.schema = require('../schema');
config.cleanupConsumers = false; // Should always be false for Kafka

/* Kafka Settings */
// config.kafkaConnectionString = '172.16.131.3:2181';
// config.kafkaConsumerOptions = {
//   groupId: serviceDetails.name,
//   autoCommit: true,
//   fromBeginning: false,
//   fetchMaxWaitMs: 1000,
//   fetchMaxBytes: 1024 * 1024
// };
/* AMQP Settings */
// config.amqp = false;
// config.exchange = 'worker-queue';
// config.exchangeType = 'fanout';

/* Service details */
var serviceDetails = config.serviceDetails = {};
serviceDetails.hostname = require('os').hostname();
serviceDetails.ip = require('ip').address();
serviceDetails.pid = process.pid;
serviceDetails.name = process.env.MSB_SERVICE_NAME || pkg && pkg.name;
serviceDetails.version = process.env.MSB_SERVICE_VERSION || pkg && pkg.version;
serviceDetails.instanceId = process.env.MSB_SERVICE_INSTANCE_ID || generateId();

/* Override defaults from file */
if (process.env.MSB_CONFIG_PATH) {
  var configPath = path.resolve(process.env.MSB_CONFIG_PATH);
  var rawJson = require('fs').readFileSync(configPath);
  var jsonObj = JSON.parse(rawJson);
  require('lodash').merge(config, jsonObj);
}

/* Set any values that need to be set using the final config here */
/* e.g. `config.kafkaConsumerOptions.groupId = serviceDetails.name;` */

/**
 * Return the contents of package.json as an object
 * @return {Object}
 */
function _mainPackage() {
  var pkg;
  _.find(process.mainModule.paths, function(modulesPath) {
    var pathToPackage = path.resolve(modulesPath, '..', 'package.json');
    try {
      pkg = require(pathToPackage);
    } catch (e) {
    }
    return pkg;
  });
  return pkg;
}
