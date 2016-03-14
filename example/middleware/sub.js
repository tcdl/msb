'use strict';
/**
 * This subscriber will receive all messages published
 */
var msb = require('../..');

msb
  .channelManager
  .findOrCreateConsumer('test:pubsub', {groupId: false})
  .on('message', function(message) {
    console.log('sub:' + message.payload.body.i);
  })
  .on('error', console.error);
