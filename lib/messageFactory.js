'use strict';
var _ = require('lodash');
var generateId = require('./support/generateId');
var serviceDetails = require('./support/serviceDetails');
var INSTANCE_ID = serviceDetails.instanceId;

var messageFactory = exports;

messageFactory.createBaseMessage = function(originalMessage) {
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

messageFactory.createBroadcastMessage = function(config, originalMessage) {
  var message = messageFactory.createBaseMessage(originalMessage);

  message.topics.to = config.namespace;

  return message;
};

messageFactory.createRequestMessage = function(config, originalMessage) {
  var message = messageFactory.createBroadcastMessage(config, originalMessage);

  message.topics.ack = config.namespace + ':ack:' + INSTANCE_ID;
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

  message.topics.to = originalMessage.topics.ack;
  message.ack = ack;

  return message;
};

messageFactory.createAck = function(config) {
  return {
    responderId: config.groupId || generateId(),
    responsesRemaining: null, // -1 decrements, 0-n changes sets this remaining
    timeoutMs: null // Defaults to the timeout on the collector/requester
  };
};

messageFactory.createMeta = function() {
  return {
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
