'use strict';
var _ = require('lodash');
var generateId = require('./support/generateId');
var serviceDetails = require('./support/serviceDetails');
var INSTANCE_ID = require('./support/instanceId');

var messageFactory = exports;

messageFactory.createBaseMessage = function(config) {
  var message = {
    id: generateId(), // This identifies this message
    correlationId: generateId(), // This identifies this flow
    parentMessage: null, // Complete parent message, does not have to be of the same correlation id
    topics: {
      to: config.namespace
    },
    meta: null, // To be filled with createMeta() -> completeMeta() sequence
    ack: {}, // State of ack section
    req: {}, // State of res section (Read-only)
    res: {}  // State of req section
  };

  return message;
};

messageFactory.createOriginalMessage = function(config) {
  var message = messageFactory.createBaseMessage(config);

  message.topics.ack = config.namespace + '.ack.' + INSTANCE_ID;
  message.topics.contrib = config.namespace + '.contrib.' + INSTANCE_ID;

  return message;
};

messageFactory.createContribMessage = function(originalMessage) {
  var message = createChildMessage(originalMessage);

  message.topics.to = originalMessage.topics.contrib;

  return message;
};

messageFactory.createAckMessage = function(originalMessage) {
  var message = createChildMessage(originalMessage);

  message.topics.to = originalMessage.topics.ack;

  return message;
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

function createChildMessage(parentMessage) {
  var message = {
    id: generateId(),
    correlationId: parentMessage.correlationId,
    parentMessage: parentMessage,
    topics: {
      from: parentMessage.topics.to
    },
    meta: null, // To be filled with createMeta() -> completeMeta() sequence
    ack: _.cloneDeep(parentMessage.ack), // Default from parent message
    req: parentMessage.req, // Read-only
    res: _.cloneDeep(parentMessage.res) // Default from parent message
  };

  return message;
}
