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

  Requester.super_.apply(this, arguments);
}

util.inherits(Requester, Collector);
var requester = Requester.prototype;

requester.publish = function(payload) {
  var self = this;

  if (payload) {
    this.message.payload = payload;
  }

  if (self.waitForResponses) {
    // Bind it here should you want to override it on an instance
    this.shouldAcceptMessageFn = this.shouldAcceptMessageFn.bind(this);
    self.listenForResponses(self.message.topics.response, self.shouldAcceptMessageFn);
  }

  messageFactory.completeMeta(this.message, this.meta);

  channelManager
  .findOrCreateProducer(self.message.topics.to)
  .publish(self.message, function(err) {
    if (err) return self.emit('error', err);
    if (!self.isAwaitingResponses()) return self.end();

    self._enableTimeout();
  });

  return self;
};

/** Override this to filter messages accepted. */
requester.shouldAcceptMessageFn = function(message) {
  var shouldAcceptMessageFn = message.correlationId === this.message.correlationId;
  // if (!shouldAcceptMessageFn || message.topics.to[0] === '_') return shouldAcceptMessageFn;
  // console.log(message.topics.to, (message.payload) ? 'res' : 'ack', message.meta.serviceDetails.instanceId, message.correlationId, message.meta.durationMs + '/' + (Date.now() - new Date(message.meta.createdAt)), message.meta.serviceDetails.name);
  return shouldAcceptMessageFn;
};

module.exports = Requester;
