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

  channel = producersByTopic[topic] = channelManager.createRawProducer(topic);

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

channelManager.createRawProducer = function(topic) {
  return (pub || createAdapterPublisher()).channel(helpers.validatedTopic(topic));
};

// Consumer listens on a general topic
channelManager.findOrCreateConsumer = function(topic, options) {
  var channel = consumersByTopic[topic];
  if (channel) return channel;

  var isServiceChannel = (topic[0] === '_');
  channel = consumersByTopic[topic] = new EventEmitter();
  channel.raw = channelManager.createRawConsumer(topic, options);
  channel.setMaxListeners(0);

  function onMessage(message) {
    if (messageHasExpired(message)) return;
    channelManager.emit(channelManager.CONSUMER_NEW_MESSAGE_EVENT, topic);
    channel.emit('message', message);
  }

  if (!isServiceChannel && config.schema) {
    channel.raw.on('message', validateWithSchema.onEvent(config.schema, onMessage));
  } else {
    channel.raw.on('message', onMessage);
  }

  channelManager.emit(channelManager.CONSUMER_NEW_TOPIC_EVENT, topic);

  if (isServiceChannel || !config.cleanupConsumers) return channel;

  channel.on('removeListener', function(eventName) {
    if (eventName !== 'message') return;
    if (~consumerTopicsToCheck.indexOf(topic) || channel.listeners(eventName).length) return;
    consumerTopicsToCheck.push(topic);

    if (consumerTopicsToCheck.length > 1) return;
    setImmediate(checkConsumers);
  });

  return channel;
};

channelManager.createRawConsumer = function(topic, options) {
  var a = adapter();

  var subscriberConfig = _.merge({
    channel: helpers.validatedTopic(topic)
  }, adapterConfig, options);

  return a.Subscribe(subscriberConfig);
};

// Backward-compatibility
channelManager.createProducer = channelManager.createRawProducer;
channelManager.createConsumer = channelManager.createRawConsumer;

var ADAPTER_PATHS = {
  redis: './adapters/redis',
  amqp: './adapters/amqp',
  kafka: './adapters/kafka',
  local: './adapters/local'
};

function adapter() {
  adapterConfig = config[config.brokerAdapter];
  if (!adapterConfig) throw new Error('Invalid broker adapter \'' + config.brokerAdapter + '\'');
  return require(ADAPTER_PATHS[config.brokerAdapter]);
}

function createAdapterPublisher() {
  pub = adapter().Publish(adapterConfig);
  return pub;
}

function checkConsumers() {
  consumerTopicsToCheck.forEach(function(topic) {
    var channel = consumersByTopic[topic];
    if (channel.listeners('message').length) return; // Still has listeners

    removeConsumer(channel, topic);
  });
  consumerTopicsToCheck = [];
}

function removeConsumer(channel, topic) {
  delete(consumersByTopic[topic]);
  channel.raw.close();
  channelManager.emit(channelManager.CONSUMER_REMOVED_TOPIC_EVENT, topic);
}

function messageHasExpired(message) {
  return message.meta && message.meta.ttl &&
    new Date(message.meta.createdAt) < new Date(Date.now() - message.meta.ttl);
}

function noop() {}
