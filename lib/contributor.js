'use strict';
var EventEmitter = require('events').EventEmitter;
var channelManager = require('./channelManager');
var messageFactory = require('./messageFactory');

function Contributor(message, config) {
  if (!(this instanceof Contributor)) return new Contributor(message, config);

  this.message = message;
  this.config = config;
}
var contributor = Contributor.prototype;

contributor.sendAckWithTimeout = function(timeoutMs, cb) {
  var ackMessage = messageFactory.createAckMessage(this.message, {
    contribTimeoutMs: timeoutMs
  });

  channelManager
  .findOrCreateProducer(ackMessage.topics.ack)
  .publish(ackMessage, cb || noop);
};

contributor.send = function(cb) {
  channelManager
  .findOrCreateProducer(this.message.topics.contrib)
  .publish(this.message, cb || noop);
};

/*
  Returns a Contributor instance for every message received on the topic.

  @param {object} config
  @param {string} [config.namespace]
  @param {string} [config.topic] If you don't provide a namespace you must provide a topic
  @param {function} listener
*/
Contributor.attachListener = function(config, listener) {
  var topic = config.topic || config.namespace + '.original';

  var channel = channelManager.findOrCreateConsumer(topic);

  channel.on('message', function(message) {
    listener(new Contributor(message, config));
  });

  return channel;
};

module.exports = Contributor;

function noop() {}
