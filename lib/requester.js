'use strict';
var _ = require('lodash');
var util = require('util');
var channelManager = require('./channelManager');
var messageFactory = require('./messageFactory');
var Collector = require('./collector');

function Requester(config, originalMessage) {
  if (!(this instanceof Requester)) return new Requester(config, originalMessage);

  this.meta = messageFactory.createMeta(config, originalMessage);
  this.message = messageFactory.createRequestMessage(config, originalMessage);
  this.originalMessage = originalMessage;
  this.requestChannelTimeoutMs = ('requestChannelTimeoutMs' in config) ?
    config.requestChannelTimeoutMs : 15 * 60000; // Default: 15 minutes

  Requester.super_.apply(this, arguments);
}

util.inherits(Requester, Collector);
var requester = Requester.prototype;

requester.publish = function(payload) {
  if (payload) {
    this.message.payload = payload;
  }

  if (this.waitForAcksMs || this.waitForResponses) {
    // Bind it here should you want to override it on an instance
    this.shouldAcceptMessageFn = this.shouldAcceptMessageFn.bind(this);
    this.listenForResponses(this.message.topics.response, this.shouldAcceptMessageFn);
  }

  messageFactory.completeMeta(this.message, this.meta);

  if (!this.responseChannel) return this._publish();
  this.responseChannel.onceConsuming(this._publish.bind(this));
  return this;
};

requester._publish = function() {
  var self = this;

  channelManager
  .findOrCreateProducer(self.message.topics.to, this.requestChannelTimeoutMs)
  .publish(self.message, function(err) {
    if (err) return self.emit('error', err);
    if (!self.isAwaitingAcks() && !self.isAwaitingResponses()) return self.end();

    self.enableTimeout();
  });

  return self;
};

/** Override this to filter messages accepted. */
requester.shouldAcceptMessageFn = function(message) {
  var shouldAcceptMessageFn = message.correlationId === this.message.correlationId;
  return shouldAcceptMessageFn;
};

module.exports = Requester;
