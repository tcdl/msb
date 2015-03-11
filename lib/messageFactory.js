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
    topics: {
      to: config.namespace
    },
    meta: null, // To be filled with createMeta() -> completeMeta() sequence
    ack: null, // To be filled on ack or contrib
    req: {}, // State of res section (Read-only)
    res: {}  // State of req section
  };

  return message;
};

messageFactory.createOriginalMessage = function(config) {
  var message = messageFactory.createBaseMessage(config);

  message.topics.ack = config.namespace + ':ack:' + INSTANCE_ID;
  message.topics.contrib = config.namespace + ':contrib:' + INSTANCE_ID;

  return message;
};

messageFactory.createContribMessage = function(originalMessage) {
  var message = createChildMessage(originalMessage);

  message.topics.to = originalMessage.topics.contrib;

  return message;
};

messageFactory.createAckMessage = function(originalMessage, ack) {
  var message = createChildMessage(originalMessage);

  message.topics.to = originalMessage.topics.ack;
  message.ack = ack;

  return message;
};

messageFactory.createAck = function(config) {
  return {
    contributorId: config.groupId || generateId(),
    contribsRemaining: null, // -1 decrements, 0-n changes sets this remaining
    timeoutMs: null // Defaults to the timeout on the collector/originator
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

function createChildMessage(originalMessage) {
  var message = {
    id: generateId(),
    correlationId: originalMessage.correlationId,
    topics: {
      from: originalMessage.topics.to
    },
    meta: null, // To be filled with createMeta() -> completeMeta() sequence
    ack: null, // To be filled on ack or contrib
    req: originalMessage.req, // Read-only
    res: _.cloneDeep(originalMessage.res) // Default from parent message
  };

  return message;
}
