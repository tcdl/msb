'use strict';
var _ = require('lodash');
var util = require('util');
var channelManager = require('./channelManager');
var EventEmitter = require('events').EventEmitter;
var logger = require('./support/logger');

function Collector(config) {
  if (!(this instanceof Collector)) return new Collector(config);

  config = config || {};

  this.startedAt = new Date();
  this.isCanceled = false;

  var waitForAcksMs = config.waitForAcksMs || config.ackTimeout; // Backward-compatibility
  this.waitForAcksMs = waitForAcksMs;
  this.waitForAcksUntil = null;

  var waitForResponsesMs = config.waitForResponsesMs || config.responseTimeout; // Backward-compatibility
  this.timeoutMs = waitForResponsesMs || 3000;

  this._currentTimeoutMs = this.timeoutMs;
  this._timeoutMsById = null;

  if ('waitForResponses' in config && config.waitForResponses !== -1) {
    this.waitForResponses = config.waitForResponses;
  } else {
    this.waitForResponses = Infinity;
  }

  this._responsesRemainingById = null;
  this._responsesRemaining = this.waitForResponses;

  this.ackMessages = [];
  this.payloadMessages = [];
  this.responseMessages = this.payloadMessages; // Backward-compatibility
  this._onTimeout = this._onTimeout.bind(this);
  this._onError = this._onError.bind(this);

  this.once('error', this._onError);
}

util.inherits(Collector, EventEmitter);
var collector = Collector.prototype;

collector.isAwaitingAcks = function() {
  return this.waitForAcksUntil && this.waitForAcksUntil > Date.now();
};

collector.isAwaitingResponses = function() {
  return this._getResponsesRemaining();
};

collector.listenForResponses = function(topic, shouldAcceptMessageFn) {
  if (this.listeners('error').length < 2) {
    logger.warn('A Collector \'error\' event handler should be implemented.');
  }
  this._onResponseMessage = this._onResponseMessage.bind(this, shouldAcceptMessageFn);
  this.responseChannel = channelManager.findOrCreateConsumer(topic);
  this.responseChannel.on('message', this._onResponseMessage);
  if (this.waitForAcksMs) this.waitForAcksUntil = new Date(this.startedAt.valueOf() + this.waitForAcksMs);
  return this;
};

collector.removeListeners = function() {
  if (this.responseChannel) this.responseChannel.removeListener('message', this._onResponseMessage);
};

collector.cancel = function() {
  clearTimeout(this._timeout);
  clearTimeout(this._ackTimeout);
  this.removeListeners();
  this.isCanceled = true;
};

collector.end = function() {
  this.cancel();
  this.emit('end');
};

collector.enableTimeout = function() {
  clearTimeout(this._timeout);
  var newTimeoutMs = this._currentTimeoutMs - (Date.now() - this.startedAt.valueOf());
  this._timeout = setTimeout(this._onTimeout, newTimeoutMs);
  return this;
};

collector._onError = function() {
  this.cancel();
};

collector._onTimeout = function() {
  this.end();
};

collector._enableAckTimeout = function() {
  if (this._ackTimeout) return;

  this._ackTimeout = setTimeout(this._onAckTimeout.bind(this), this.waitForAcksUntil - Date.now());
};

collector._onAckTimeout = function() {
  if (this.isAwaitingResponses()) return;

  this.end();
};

collector._onResponseMessage = function(shouldAcceptMessageFn, message) {
  if (shouldAcceptMessageFn && !shouldAcceptMessageFn(message)) return;

  if (message.payload) {
    this.payloadMessages.push(message);
    this.emit('payload', message.payload, message);
    this.emit('response', message.payload, message); // Backward-compatibility
    this._incResponsesRemaining(-1); // Not responder-specific
  } else {
    this.ackMessages.push(message);
    this.emit('ack', message.ack, message);
  }

  if (this.isCanceled) return; // e.g. error occurs during event

  this._processAck(message.ack);

  if (this.isAwaitingResponses()) return;
  if (this.isAwaitingAcks()) return this._enableAckTimeout();

  this.end();
};

collector._processAck = function(ack) {
  if (!ack) return; // `null` ack is valid

  if ('timeoutMs' in ack) {
    var newTimeoutMs = this._setTimeoutMsForResponderId(ack.responderId, ack.timeoutMs);
    if (newTimeoutMs !== null) {
      var prevTimeoutMs = this._currentTimeoutMs;

      this._currentTimeoutMs = this._getMaxTimeoutMs();
      if (prevTimeoutMs !== this._currentTimeoutMs) this.enableTimeout();
    }
  }

  if ('responsesRemaining' in ack) {
    this._setResponsesRemainingForResponderId(ack.responderId, ack.responsesRemaining);
  }
};

collector._getMaxTimeoutMs = function() {
  if (!this._timeoutMsById) return this.timeoutMs;

  var responsesRemainingById = this._responsesRemainingById;
  var timeoutMs = this.timeoutMs;
  for (var key in this._timeoutMsById) {
    // Use only what we're waiting for
    if (responsesRemainingById && (key in responsesRemainingById) && !responsesRemainingById[key]) continue;
    timeoutMs = Math.max(this._timeoutMsById[key], timeoutMs);
  }
  return timeoutMs;
};

collector._getResponsesRemaining = function() {
  if (!this._responsesRemainingById) return this._responsesRemaining;

  var _responsesRemaining = 0;
  for (var key in this._responsesRemainingById) {
    _responsesRemaining += this._responsesRemainingById[key];
  }
  return Math.max(this._responsesRemaining, _responsesRemaining);
};

collector._setTimeoutMsForResponderId = function(responderId, timeoutMs) {
  var _timeoutMsById = this._timeoutMsById = this._timeoutMsById || {};
  if (_timeoutMsById[responderId] === timeoutMs) return null; // Not changed
  _timeoutMsById[responderId] = timeoutMs;
  return timeoutMs;
};

collector._incResponsesRemaining = function(inc) {
  return this._responsesRemaining = Math.max(this._responsesRemaining + inc, 0);
};

collector._setResponsesRemainingForResponderId = function(responderId, responsesRemaining) {
  var atMin = (responsesRemaining < 0 && (!this._responsesRemainingById || !this._responsesRemainingById[responderId]));
  if (atMin) return null;

  var _responsesRemainingById = this._responsesRemainingById = this._responsesRemainingById || {};
  if (responsesRemaining === 0) {
    _responsesRemainingById[responderId] = 0;
  } else {
    _responsesRemainingById[responderId] = _responsesRemainingById[responderId] || 0;
    _responsesRemainingById[responderId] = Math.max(0, _responsesRemainingById[responderId] + responsesRemaining);
  }
  return _responsesRemainingById[responderId];
};

module.exports = Collector;

