'use strict';
var _ = require('lodash');
var queue = require('message-queue')('redis');
var pub = null;

/** Set host and port on the config */
exports.config = {};

var producersByTopic = {};

exports.findOrCreateProducer = function(topic) {
  var channel = producersByTopic[topic];
  if (channel) return channel;
  return producersByTopic[topic] = (pub || createPublisher()).channel(topic);
};

var consumersByTopic = {};

// Consumer listens on a general topic
exports.findOrCreateConsumer = function(topic) {
  var channel = consumersByTopic[topic];
  if (channel) return channel;

  var config = _.merge({ channel: topic }, exports.config);
  channel = consumersByTopic[topic] = queue.Subscribe(config);
  channel.setMaxListeners(0);
  return channel;
};

function createPublisher() {
  pub = queue.Publish(exports.config);
  return pub;
}
