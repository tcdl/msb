'use strict';
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('msb:channelManager');
var msb = require('../index');
var config = require('./config');
var validateWithSchema = require('./validateWithSchema');
var messageFactory = require('./messageFactory');
var helpers = require('./support/helpers');
var pub;
var adapterConfig;

var channelManager = module.exports = new EventEmitter();
var producersByTopic = {};
var consumersByTopic = {};
var consumerTopicsToCheck = [];
var toCheckConsumers = false;

channelManager.PRODUCER_NEW_TOPIC_EVENT = 'newProducerOnTopic';
channelManager.PRODUCER_NEW_MESSAGE_EVENT = 'newProducedMessage';
channelManager.CONSUMER_NEW_TOPIC_EVENT = 'newConsumerOnTopic';
channelManager.CONSUMER_REMOVED_TOPIC_EVENT = 'removedConsumerOnTopic';
channelManager.CONSUMER_NEW_MESSAGE_EVENT = 'newConsumedMessage';

channelManager.findOrCreateProducer = function(topic) {
  var channel = producersByTopic[topic];
  if (channel) return channel;

  channel = producersByTopic[topic] = channelManager.createProducer(topic);

  channelManager.emit(channelManager.PRODUCER_NEW_TOPIC_EVENT, topic);

  channel.publish_ = channel.publish;
  channel.publish = function(message, cb) {
    channel.publish_(message, function(err) {
      if (err) return cb(err);
      channelManager.emit(channelManager.PRODUCER_NEW_MESSAGE_EVENT, topic);
      cb();
    });
  };

  return channel;
};

channelManager.createProducer = function(topic) {
  return (pub || createPublisher()).channel(helpers.validatedTopic(topic));
};

// Consumer listens on a general topic
channelManager.findOrCreateConsumer = function(topic, options) {
  var channel = consumersByTopic[topic];
  if (channel) return channel;

  channel = consumersByTopic[topic] = channelManager.createConsumer(topic, options);
  channel.setMaxListeners(0);

  channelManager.emit(channelManager.CONSUMER_NEW_TOPIC_EVENT, topic);

  if (topic[0] === '_') return channel;

  var onMessageFn = function(message) {
    channelManager.emit(channelManager.CONSUMER_NEW_MESSAGE_EVENT, topic);
  };

  if (config.schema) {
    channel.on('message', validateWithSchema.onEvent(config.schema, onMessageFn));
  } else {
    channel.on('message', onMessageFn);
  }

  if (!config.cleanupConsumers) return channel;

  channel.on('removeListener', function(eventName) {
    if (eventName !== 'message') return;
    if (~consumerTopicsToCheck.indexOf(topic) || channel.listeners(eventName).length > 1) return;
    consumerTopicsToCheck.push(topic);

    if (consumerTopicsToCheck.length > 1) return;
    setImmediate(checkConsumers);
  });
  return channel;
};

channelManager.createConsumer = function(topic, options) {
  var adapter = queue();

  var subscriberConfig = _.merge({
    channel: helpers.validatedTopic(topic)
  }, adapterConfig, options);

  return adapter.Subscribe(subscriberConfig);
};

var ADAPTER_PATHS = {
  redis: './adapters/redis',
  amqp: './adapters/amqp',
  kafka: './adapters/kafka'
};

function queue() {
  adapterConfig = config[config.brokerAdapter];
  if (!adapterConfig) throw new Error('Invalid broker adapter \'' + config.brokerAdapter + '\'');
  return require(ADAPTER_PATHS[config.brokerAdapter]);
}

function createPublisher() {
  pub = queue().Publish(adapterConfig);
  return pub;
}

function removeConsumer(channel, topic) {
  delete(consumersByTopic[topic]);
  channel.close();
  channelManager.emit(channelManager.CONSUMER_REMOVED_TOPIC_EVENT, topic);
}

function checkConsumers() {
  consumerTopicsToCheck.forEach(function(topic) {
    var channel = consumersByTopic[topic];
    if (channel.listeners('message').length > 1) return; // Still has listeners

    removeConsumer(channel, topic);
  });
  consumerTopicsToCheck = [];
}

function noop() {}
