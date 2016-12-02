import serviceDetails = require("./support/serviceDetails");
import generateId = require("./support/generateId");
var _ = require('lodash');
var INSTANCE_ID = serviceDetails.instanceId;

var messageFactory = exports;

var contextMessage = null;

messageFactory.createBaseMessage = function(config, originalMessage) {
  if (originalMessage === undefined) originalMessage = contextMessage;

  var message = {
    id: generateId(), // This identifies this message
    correlationId: generateId(), // This identifies this flow
    tags: messageFactory._createTags(config, originalMessage),
    topics: {},
    meta: null, // To be filled with createMeta() -> completeMeta() sequence
    ack: null, // To be filled on ack or response
    payload: {}
  };

  return message;
};

messageFactory.createDirectedMessage = function(config, originalMessage) {
  var message = messageFactory.createBaseMessage(config, originalMessage);

  if (config.middlewareNamespace) {
    message.topics.forward = config.namespace;
    message.topics.to = config.middlewareNamespace;
  } else {
    message.topics.to = config.namespace;
  }

  if (config.routingKey) {
    message.topics.routingKey = config.routingKey;
  }

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

messageFactory.createResponseMessage = function(config, originalMessage, ack, payload) {
  var message = messageFactory.createBaseMessage(config, originalMessage);

  message.correlationId = originalMessage && originalMessage.correlationId;
  message.topics.to = originalMessage.topics.response;
  message.ack = ack;
  message.payload = payload;

  return message;
};

messageFactory.createAckMessage = function(config, originalMessage, ack) {
  var message = messageFactory.createResponseMessage(config, originalMessage, ack, null);

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
    publishedAt: null,
    durationMs: null,
    serviceDetails: serviceDetails
  };
};

messageFactory.completeMeta = function(message, meta) {
  meta.publishedAt = new Date();
  meta.durationMs = meta.publishedAt - meta.createdAt.valueOf();
  message.meta = meta;
  return message;
};

messageFactory.startContext = function(message) {
  contextMessage = message;
};

messageFactory.endContext = function() {
  contextMessage = null;
};

messageFactory._createTags = function(config, originalMessage) {
  return _.union(config && config.tags, originalMessage && originalMessage.tags);
};
