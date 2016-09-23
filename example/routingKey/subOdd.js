'use strict';
/**
 * This subscriber will receive all messages published
 */
var msb = require('../..');

msb
  .channelManager
  .findOrCreateConsumer('test:pubsub:routing-key', { type: 'topic', bindingKeys: 'odd', groupId: false})
  .on('message', function(message) {
    console.log('subOdd:' + message.payload.body.i);
  })
  .on('error', console.error);
