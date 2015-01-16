'use strict';
var queue = require('message-queue')('redis');
var pub = queue.Publish();

var producersByTopic = {};

exports.findOrCreateProducer = function(topic) {
  var channel = producersByTopic[topic];
  if (channel) return channel;

  return producersByTopic[topic] = pub.channel(topic);
};

var consumersByTopic = {};

// Consumer listens on a general topic
exports.findOrCreateConsumer = function(topic) {
  var channel = consumersByTopic[topic];
  if (channel) return channel;

  return consumersByTopic[topic] = queue.Subscribe({ channel: topic });
};
