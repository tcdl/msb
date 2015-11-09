'use strict';
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var messageFactory = require('./messageFactory');
var ResponderServer = require('./responderServer');

function Responder(config, originalMessage) {
  if (!(this instanceof Responder)) return new Responder(config, originalMessage);
  if (!config) throw new Error('config is required');
  if (!originalMessage) throw new Error('originalMessage is required');

  this.channelManager = require('./channelManager').default;
  this.config = config;
  this.meta = messageFactory.createMeta(config, originalMessage);
  this.ack = messageFactory.createAck(config);
  this.originalMessage = originalMessage;
  this.responseChannelTimeoutMs = ('responseChannelTimeoutMs' in config) ?
    config.responseChannelTimeoutMs : 15 * 60000; // Default: 15 minutes
}
var responder = Responder.prototype;

// must always specify responsesRemaining, null means no-change,
responder.sendAck = function(timeoutMs, responsesRemaining, cb) {
  if (!cb) {
    cb = _.last(arguments);
    if (!_.isFunction(cb)) cb = null;
    if (timeoutMs === cb) timeoutMs = null;
    if (responsesRemaining === cb) responsesRemaining = undefined;
  }

  this.ack.timeoutMs = (timeoutMs > -1) ? timeoutMs : this.ack.timeoutMs;
  if (_.isUndefined(responsesRemaining)) {
    this.ack.responsesRemaining = 1;
  } else {
    this.ack.responsesRemaining = responsesRemaining;
  }

  var ackMessage = messageFactory.createAckMessage(this.config, this.originalMessage, this.ack);

  this._sendMessage(ackMessage, cb);
};
responder.sendAckWithTimeout = responder.sendAck; // Backward-compatibility

responder.send = function(payload, cb) {
  this.ack.responsesRemaining = -1;
  var message = messageFactory.createResponseMessage(this.config, this.originalMessage, this.ack, payload);
  this._sendMessage(message, cb);
};

responder._sendMessage = function(message, cb) {
  messageFactory.completeMeta(message, this.meta);

  this
  .channelManager
  .findOrCreateProducer(message.topics.to, this.responseChannelTimeoutMs)
  .publish(message, cb || noop);
};

/*
  Returns an responder emitter, to emit a responder instance for every message received on the topic.

  @param {object} config
  @param {string} [config.namespace]
  @param {string} [config.topic] If you don't provide a namespace you must provide a topic
  @param {function} listener
*/
Responder.createEmitter = function(config, channelManager) {
  if (!channelManager) channelManager = require('./channelManager').default;

  var emitter = new EventEmitter();
  var topic = config.namespace;
  var channelOptions = ('groupId' in config) ? { groupId: config.groupId } : null;
  var channel = channelManager.findOrCreateConsumer(topic, channelOptions);

  function onMessage(message) {
    var responder = new Responder(config, message);
    responder.channelManager = channelManager;
    emitter.emit('responder', responder);
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
