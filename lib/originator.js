'use strict';
var _ = require('lodash');
var util = require('util');
var channelManager = require('./channelManager');
var messageFactory = require('./messageFactory');
var Collector = require('./collector');

function Originator(config) {
  if (!(this instanceof Originator)) return new Originator(config);

  this.meta = messageFactory.createMeta();
  this.message = messageFactory.createOriginalMessage(config);

  Originator.super_.apply(this, arguments);
}

util.inherits(Originator, Collector);
var originator = Originator.prototype;

originator.publish = function() {
  var self = this;

  if (self.waitForContribs) {
    // Bind it here should you want to override it on an instance
    this.shouldAcceptMessageFn = this.shouldAcceptMessageFn.bind(this);
    self.listenForContribs(self.message.topics.contrib, self.shouldAcceptMessageFn);
    self.listenForAcks(self.message.topics.ack, self.shouldAcceptMessageFn);
  }

  messageFactory.completeMeta(this.message, this.meta);

  channelManager
  .findOrCreateProducer(self.message.topics.to)
  .publish(self.message, function(err) {
    if (err) return self.emit('error', err);
    if (!self.awaitingContribCount()) return self.end();

    self._enableTimeout();
  });

  return self;
};

/** Override this to filter messages accepted. */
originator.shouldAcceptMessageFn = function(message) {
  return message.correlationId === this.message.correlationId;
};

module.exports = Originator;