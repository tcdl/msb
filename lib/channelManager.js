'use strict';
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('msb:channelManager');
var msb = require('../index');
var queue = require('message-queue')('redis');
var messageFactory = require('./messageFactory');
var helpers = require('./support/helpers');
var pub = null;

var channelManager = module.exports = new EventEmitter();
var producersByTopic = {};
var consumersByTopic = {};

channelManager.PRODUCER_NEW_TOPIC_EVENT = 'newProducerOnTopic';
channelManager.CONSUMER_NEW_TOPIC_EVENT = 'newConsumerOnTopic';
channelManager.CONSUMER_NEW_MESSAGE_EVENT = 'newConsumedMessage';

channelManager.channelInfo = {};

/** Set host and port on the config */
channelManager.config = {};

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

  channel.on('message', function(message) {
    channelManager.emit(channelManager.CONSUMER_NEW_MESSAGE_EVENT, topic);
  });
  return channel;
};

channelManager.createConsumer = function(topic) {
  var config = _.merge({ channel: helpers.validatedTopic(topic) }, channelManager.config);
  return queue.Subscribe(config);
};

function createPublisher() {
  pub = queue.Publish(channelManager.config);
  return pub;
}

function noop() {}
