'use strict';
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var channelManager = require('./channelManager');
var messageFactory = require('./messageFactory');
var ResponderServer = require('./responderServer');

function Responder(config, originalMessage) {
  if (!(this instanceof Responder)) return new Responder(config, originalMessage);
  if (!originalMessage) throw new Error('originalMessage is required');

  this.meta = messageFactory.createMeta(config, originalMessage);
  this.ack = messageFactory.createAck(config);
  this.originalMessage = originalMessage;
}
var responder = Responder.prototype;

// must always specify responsesRemaining, null means no-change,
responder.sendAck = function(timeoutMs, responsesRemaining, cb) {
  if (!cb) {
    cb = _.last(arguments);
    if (!_.isFunction(cb)) cb = null;
    if (timeoutMs === cb) timeoutMs = null;
    if (responsesRemaining === cb) responsesRemaining = null;
  }

  this.ack.timeoutMs = (timeoutMs > -1) ? timeoutMs : this.ack.timeoutMs;
  this.ack.responsesRemaining = (responsesRemaining && responsesRemaining !== null) ? responsesRemaining : this.ack.responsesRemaining || 1;

  var ackMessage = messageFactory.createAckMessage(this.originalMessage, this.ack);

  this._sendMessage(ackMessage, cb);
};
responder.sendAckWithTimeout = responder.sendAck; // Backward-compatibility

responder.send = function(payload, cb) {
  this.ack.responsesRemaining = -1;
  var message = messageFactory.createResponseMessage(this.originalMessage, this.ack, payload);
  this._sendMessage(message, cb);
};

responder._sendMessage = function(message, cb) {
  messageFactory.completeMeta(message, this.meta);

  channelManager
  .findOrCreateProducer(message.topics.to)
  .publish(message, cb || noop);
};

/*
  Returns an responder emitter, to emit a responder instance for every message received on the topic.

  @param {object} config
  @param {string} [config.namespace]
  @param {string} [config.topic] If you don't provide a namespace you must provide a topic
  @param {function} listener
*/
Responder.createEmitter = function(config) {
  var emitter = new EventEmitter();
  var topic = config.topic || config.namespace;
  var channel = channelManager.findOrCreateConsumer(topic);

  function onMessage(message) {
    emitter.emit('responder', new Responder(config, message));
  }

  channel.on('message', onMessage);

  emitter.end = function() {
    channel.removeListener('message', onMessage);
  };

  return emitter;
};

Responder.createServer = function(config) {
  return new ResponderServer(config);
};

module.exports = Responder;

function noop() {}
