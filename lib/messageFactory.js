'use strict';
var _ = require('lodash');
var generateId = require('./support/generateId');
var serviceDetails = require('./support/serviceDetails');
var INSTANCE_ID = serviceDetails.instanceId;

var messageFactory = exports;

var contextMessage = null;

messageFactory.createBaseMessage = function(originalMessage) {
  if (originalMessage === undefined) originalMessage = contextMessage;

  var message = {
    id: generateId(), // This identifies this message
    correlationId: (originalMessage && originalMessage.correlationId) || generateId(), // This identifies this flow
    topics: {},
    meta: null, // To be filled with createMeta() -> completeMeta() sequence
    ack: null, // To be filled on ack or response
    payload: {}
  };

  return message;
};

messageFactory.createDirectedMessage = function(config, originalMessage) {
  var message = messageFactory.createBaseMessage(originalMessage);

  message.topics.to = config.namespace;

  return message;
};

messageFactory.createBroadcastMessage = function(config, originalMessage) {
  var meta = messageFactory.createMeta(config, originalMessage);
  var message = messageFactory.createDirectedMessage(config, originalMessage);

  message.meta = meta;

  return message;
};

messageFactory.createRequestMessage = function(config, originalMessage) {
  var message = messageFactory.createDirectedMessage(config, originalMessage);

  message.topics.response = config.namespace + ':response:' + INSTANCE_ID;

  return message;
};

messageFactory.createResponseMessage = function(originalMessage, ack, payload) {
  var message = messageFactory.createBaseMessage(originalMessage);

  message.topics.to = originalMessage.topics.response;
  message.ack = ack;
  message.payload = payload;

  return message;
};

messageFactory.createAckMessage = function(originalMessage, ack) {
  var message = messageFactory.createBaseMessage(originalMessage);

  message.topics.to = originalMessage.topics.response;
  message.ack = ack;
  message.payload = null;

  return message;
};

messageFactory.createAck = function(config) {
  return {
    responderId: generateId(), // config.groupId || generateId(),
    responsesRemaining: null, // -n decrements, 0 resets, n increments
    timeoutMs: null // Defaults to the timeout on the collector/requester
  };
};

messageFactory.createMeta = function(config, originalMessage) {
  if (originalMessage === undefined) originalMessage = contextMessage;

  return {
    ttl: (config && config.ttl) || null,
    createdAt: new Date(),
    durationMs: null,
    serviceDetails: serviceDetails
  };
};

messageFactory.completeMeta = function(message, meta) {
  meta.durationMs = Date.now() - meta.createdAt.valueOf();
  message.meta = meta;
  return message;
};

messageFactory.startContext = function(message) {
  contextMessage = message;
};

messageFactory.endContext = function() {
  contextMessage = null;
};
