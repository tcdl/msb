'use strict';
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('msb:channelManager');
var queue = require('message-queue')('redis');
var msb = require('../index');
var config = require('./config');
var messageFactory = require('./messageFactory');
var helpers = require('./support/helpers');
var pub = null;

var channelManager = module.exports = new EventEmitter();
var producersByTopic = {};
var consumersByTopic = {};
var consumerTopicsToCheck = [];
var toCheckConsumers = false;

channelManager.PRODUCER_NEW_TOPIC_EVENT = 'newProducerOnTopic';
channelManager.CONSUMER_NEW_TOPIC_EVENT = 'newConsumerOnTopic';
channelManager.CONSUMER_REMOVED_TOPIC_EVENT = 'removedConsumerOnTopic';
channelManager.CONSUMER_NEW_MESSAGE_EVENT = 'newConsumedMessage';

channelManager.findOrCreateProducer = function(topic) {
  var channel = producersByTopic[topic];
  if (channel) return channel;

  channel = producersByTopic[topic] = channelManager.createProducer(topic);

  channelManager.emit(channelManager.PRODUCER_NEW_TOPIC_EVENT, topic);
  return channel;
};

channelManager.createProducer = function(topic) {
  return (pub || createPublisher()).channel(helpers.validatedTopic(topic));
};

// Consumer listens on a general topic
channelManager.findOrCreateConsumer = function(topic) {
  var channel = consumersByTopic[topic];
  if (channel) return channel;

  channel = consumersByTopic[topic] = channelManager.createConsumer(topic);
  channel.setMaxListeners(0);

  channelManager.emit(channelManager.CONSUMER_NEW_TOPIC_EVENT, topic);

  if (topic[0] === '_') return channel;

  channel.on('message', function(message) {
    channelManager.emit(channelManager.CONSUMER_NEW_MESSAGE_EVENT, topic);
  });

  channel.on('removeListener', function(eventName) {
    if (eventName !== 'message') return;
    if (~consumerTopicsToCheck.indexOf(topic) || channel.listeners(eventName).length > 1) return;
    consumerTopicsToCheck.push(topic);

    if (consumerTopicsToCheck.length > 1) return;
    setImmediate(checkConsumers);
  });
  return channel;
};

channelManager.createConsumer = function(topic) {
  var subscriberConfig = _.merge({ channel: helpers.validatedTopic(topic) }, config);
  return queue.Subscribe(subscriberConfig);
};

function createPublisher() {
  pub = queue.Publish(config);
  return pub;
}

function checkConsumers() {
  consumerTopicsToCheck.forEach(function(topic) {
    var channel = consumersByTopic[topic];
    if (channel.listeners('message').length > 1) return; // Still has listeners

    delete(consumersByTopic[topic]);
    channel.removeAllListeners();
    channelManager.emit(channelManager.CONSUMER_REMOVED_TOPIC_EVENT, topic);
  });
  consumerTopicsToCheck = [];
}

function noop() {}
