'use strict';
var EventEmitter = require('events').EventEmitter;
var channelManager = require('./channelManager');
var messageFactory = require('./messageFactory');

function Contributor(config, originalMessage) {
  if (!(this instanceof Contributor)) return new Contributor(config, originalMessage);

  this.meta = messageFactory.createMeta(config);
  this.ack = messageFactory.createAck(config);
  this.message = messageFactory.createContribMessage(originalMessage);
  this.originalMessage = originalMessage;
}
var contributor = Contributor.prototype;

contributor.sendAckWithTimeout = function(timeoutMs, remainingContribs, cb) {
  if (!cb) {
    cb = remainingContribs;
    remainingContribs = 1;
  }

  this.ack.timeoutMs = this.ack.timeoutMs || timeoutMs;
  this.ack.waitForContribs = this.ack.timeoutMs || remainingContribs;

  var ackMessage = messageFactory.createAckMessage(this.originalMessage, this.ack);
  messageFactory.completeMeta(ackMessage, this.meta);

  channelManager
  .findOrCreateProducer(ackMessage.topics.to)
  .publish(ackMessage, cb || noop);
};

contributor.send = function(cb) {
  this.ack.remainingContribs = -1;
  this.message.ack = this.ack;

  messageFactory.completeMeta(this.message, this.meta);

  channelManager
  .findOrCreateProducer(this.message.topics.to)
  .publish(JSON.stringify(this.message), cb || noop);
};

/*
  Returns an contributor emitter, to emit a contributor instance for every message received on the topic.

  @param {object} config
  @param {string} [config.namespace]
  @param {string} [config.topic] If you don't provide a namespace you must provide a topic
  @param {function} listener
*/
Contributor.createEmitter = function(config) {
  var emitter = new EventEmitter();
  var topic = config.topic || config.namespace;
  var channel = channelManager.findOrCreateConsumer(topic);

  function onMessage(message) {
    emitter.emit('contributor', new Contributor(config, message));
  }

  channel.on('message', onMessage);

  emitter.end = function() {
    channel.removeListener('message', onMessage);
  };

  return emitter;
};

Contributor.attachListener = function(config, listener) {
  var emitter = Contributor.createEmitter(config);
  emitter.on('contributor', listener);
  return emitter;
};

module.exports = Contributor;

function noop() {}
