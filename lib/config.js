var serviceDetails = require('./support/serviceDetails');
var config = exports;

// Defaults (can be overrided)
config.schema = require('../schema');
config.cleanupConsumers = true; // Should always be false for Kafka
// config.kafkaConnectionString = '172.16.131.3:2181';
config.kafkaConsumerOptions = {
  groupId: serviceDetails.name,
  autoCommit: true,
  fromBeginning: false,
  fetchMaxWaitMs: 1000,
  fetchMaxBytes: 1024 * 1024
};
config.amqp = false;
// config.exchange = 'worker-queue';
// config.exchangeType = 'fanout';
