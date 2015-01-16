'use strict';
var _ = require('lodash');
var util = require('util');
var channelManager = require('./channelManager');
var EventEmitter = require('events').EventEmitter;

function Collector(config) {
  this.config = config;
  this.startedAt = new Date();
  this.timeoutMs = config.contribTimeout || 3000;
  this.waitForContribs = ('waitForContribs' in config) ? config.waitForContribs : Number.MAX_VALUE;
  this.ackMessages = [];
  this.contribMessages = [];
  this._onTimeout = this._onTimeout.bind(this);
}

util.inherits(Collector, EventEmitter);
var collector = Collector.prototype;

collector.awaitingContribCount = function() {
  return this.waitForContribs - this.contribMessages.length;
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

collector._final = function() {
  if (this.resChannel) this.resChannel.removeListener('message', this._onContribMessage);
  if (this.ackChannel) this.ackChannel.removeListener('message', this._onAckMessage);

  this.emit('final', this.contribMessages[this.contribMessages.length - 1] || this.message);
};

collector._enableTimeout = function() {
  clearTimeout(this._timeout);

  var newTimeoutMs = this.timeoutMs - (Date.now() - this.startedAt.valueOf());
  this._timeout = setTimeout(this._onTimeout, newTimeoutMs);
};

collector._updateTimeout = function(newTimeoutMs) {
  if (!newTimeoutMs || newTimeoutMs === this.timeoutMs) return;

  this.timeoutMs = newTimeoutMs;
  this._enableTimeout();
};

collector._onTimeout = function() {
  this._final();
};

collector._onContribMessage = function(shouldAcceptMessageFn, message) {
  if (shouldAcceptMessageFn && !shouldAcceptMessageFn(message)) return;

  this.contribMessages.push(message);
  this.emit('contrib', message);

  if (!this.awaitingContribCount()) this._final();
};

collector._onAckMessage = function(shouldAcceptMessageFn, message) {
  if (shouldAcceptMessageFn && !shouldAcceptMessageFn(message)) return;

  this.ackMessages.push(message);
  this.emit('ack', message);

  this._updateTimeout(message.ack.contribTimeoutMs);
};

module.exports = Collector;
