'use strict';
var _ = require('lodash');
var util = require('util');
var channelManager = require('./channelManager');
var EventEmitter = require('events').EventEmitter;

function Collector(config) {
  if (!(this instanceof Collector)) return new Collector(config);

  config = config || {};

  this.startedAt = new Date();
  this.timeoutMs = config.contribTimeout || 3000;
  this._currentTimeoutMs = this.timeoutMs;
  this._timeoutMsById = null;

  if ('waitForContribs' in config && config.waitForContribs !== -1) {
    this.waitForContribs = config.waitForContribs;
  } else {
    this.waitForContribs = Number.MAX_VALUE;
  }
  this._contribsRemainingById = null;
  this._contribsRemaining = this.waitForContribs;

  this.ackMessages = [];
  this.contribMessages = [];
  this._onTimeout = this._onTimeout.bind(this);
}

util.inherits(Collector, EventEmitter);
var collector = Collector.prototype;

collector.awaitingContribCount = function() {
  return this._getContribsRemaining();
};

collector.listenForContribs = function(topic, shouldAcceptMessageFn) {
  this._onContribMessage = this._onContribMessage.bind(this, shouldAcceptMessageFn);
  this.contribChannel = channelManager.findOrCreateConsumer(topic);
  this.contribChannel.on('message', this._onContribMessage);
};

collector.listenForAcks = function(topic, shouldAcceptMessageFn) {
  this._onAckMessage = this._onAckMessage.bind(this, shouldAcceptMessageFn);
  this.ackChannel = channelManager.findOrCreateConsumer(topic);
  this.ackChannel.on('message', this._onAckMessage);
};

collector.removeListeners = function() {
  if (this.contribChannel) this.contribChannel.removeListener('message', this._onContribMessage);
  if (this.ackChannel) this.ackChannel.removeListener('message', this._onAckMessage);
};

collector.end = function() {
  this.removeListeners();
  this.emit('end', this.contribMessages[this.contribMessages.length - 1] || this.message);
};

collector._enableTimeout = function() {
  clearTimeout(this._timeout);

  var newTimeoutMs = this._currentTimeoutMs - (Date.now() - this.startedAt.valueOf());
  this._timeout = setTimeout(this._onTimeout, newTimeoutMs);
};

collector._onTimeout = function() {
  this.end();
};

collector._onContribMessage = function(shouldAcceptMessageFn, message) {
  if (shouldAcceptMessageFn && !shouldAcceptMessageFn(message)) return;

  this.contribMessages.push(message);
  this.emit('contrib', message);
  this._incContribsRemaining(-1); // Not contributor-specific
  this._processAck(message.ack);

  if (!this.awaitingContribCount()) this.end();
};

collector._onAckMessage = function(shouldAcceptMessageFn, message) {
  if (shouldAcceptMessageFn && !shouldAcceptMessageFn(message)) return;

  this.ackMessages.push(message);
  this.emit('ack', message);
  this._processAck(message.ack);
};

collector._processAck = function(ack) {
  if (!ack) return; // `null` ack is valid

  if ('timeoutMs' in ack) {
    var newTimeoutMs = this._setTimeoutMsForContributorId(ack.contributorId, ack.timeoutMs);
    if (newTimeoutMs !== null) {
      var prevTimeoutMs = this._currentTimeoutMs;

      this._currentTimeoutMs = this._getMaxTimeoutMs();
      if (prevTimeoutMs !== this._currentTimeoutMs) this._enableTimeout();
    }
  }

  if ('contribsRemaining' in ack) {
    this._setContribsRemainingForContributorId(ack.contributorId, ack.contribsRemaining);
  }
};

collector._getMaxTimeoutMs = function() {
  if (!this._timeoutMsById) return this.timeoutMs;

  var contribsRemainingById = this._contribsRemainingById;
  var timeoutMs = this.timeoutMs;
  for (var key in this._timeoutMsById) {
    // Use only what we're waiting for
    if (contribsRemainingById && (key in contribsRemainingById) && !contribsRemainingById[key]) continue;
    timeoutMs = Math.max(this._timeoutMsById[key], timeoutMs);
  }
  return timeoutMs;
};

collector._getContribsRemaining = function() {
  if (!this._contribsRemainingById) return this._contribsRemaining;

  var _contribsRemaining = 0;
  for (var key in this._contribsRemainingById) {
    _contribsRemaining += this._contribsRemainingById[key];
  }
  return Math.max(this._contribsRemaining, _contribsRemaining);
};

collector._setTimeoutMsForContributorId = function(contributorId, timeoutMs) {
  var _timeoutMsById = this._timeoutMsById = this._timeoutMsById || {};
  if (_timeoutMsById[contributorId] === timeoutMs) return null; // Not changed
  _timeoutMsById[contributorId] = timeoutMs;
  return timeoutMs;
};

collector._incContribsRemaining = function(inc) {
  return this._contribsRemaining = Math.max(this._contribsRemaining + inc, 0);
};

collector._setContribsRemainingForContributorId = function(contributorId, _contribsRemaining) {
  this._contribsRemainingById = this._contribsRemainingById || {};
  var _contribsRemainingById = this._contribsRemainingById;
  if (_contribsRemainingById[contributorId] === _contribsRemaining) return null; // Not changed
  if (_contribsRemaining >= 0) {
    // Set
    _contribsRemainingById[contributorId] = _contribsRemaining;
  } else {
    // Subtract
    _contribsRemainingById[contributorId] = Math.max(0, _contribsRemainingById[contributorId] + _contribsRemaining);
  }
  return _contribsRemainingById[contributorId];
};

module.exports = Collector;


