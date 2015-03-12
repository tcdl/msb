'use strict';
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
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

contributor.sendAck = function(timeoutMs, contribsRemaining, cb) {
  if (!cb) {
    cb = _.last(arguments);
    if (!_.isFunction(cb)) cb = null;
    if (timeoutMs === cb) timeoutMs = null;
    if (contribsRemaining === cb) contribsRemaining = null;
  }

  this.ack.timeoutMs = (timeoutMs > -1) ? timeoutMs : this.ack.timeoutMs;
  this.ack.contribsRemaining = (contribsRemaining && contribsRemaining !== null) ? contribsRemaining : this.ack.contribsRemaining || 1;

  var ackMessage = messageFactory.createAckMessage(this.originalMessage, this.ack);

  this._sendMessage(ackMessage, cb);
};
contributor.sendAckWithTimeout = contributor.sendAck; // Backward-compatibility

contributor.send = function(cb) {
  this.ack.contribsRemaining = -1;
  this.message.ack = this.ack;

  this._sendMessage(this.message, cb);
};

contributor._sendMessage = function(message, cb) {
  messageFactory.completeMeta(message, this.meta);

  channelManager
  .findOrCreateProducer(message.topics.to)
  .publish(JSON.stringify(message), cb || noop);
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
