'use strict';
var _ = require('lodash');
var generateId = require('./support/generateId');
var INSTANCE_ID = generateId();

exports.createOriginalMessage = function(config) {
  var topics = {
    original: config.namespace + '.original',
    ack: config.namespace + '.ack.' + INSTANCE_ID, // Changes timeouts, collects meta info
    contrib: config.namespace + '.contrib.' + INSTANCE_ID, // Replaces/aggregates res
    result: config.namespace + '.result'
  };

  var message = {
    id: generateId(),
    namespace: config.namespace,
    parentMessage: null,
    topics: topics,
    meta: {
      instanceId: INSTANCE_ID,
      host: '', // etc.
      createdAt: '',
      durationMs: null,
    },
    ack: {
      // waitForContribsInc: 1,
      // contribTimeoutMs: 3000
    },
    req: {
      // Read-only
      createdAt: new Date(), // ISO Date
    },
    res: {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: null
    }
  };
  return message;
};

exports.createAckMessage = function(parentMessage, ack) {
  var message = _.cloneDeep(parentMessage);

  message.parentMessage = message;
  message.ack = ack;
  return message;
};
