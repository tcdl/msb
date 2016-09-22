'use strict';
/**
 * This subscriber will receive all messages published
 */
var msb = require('../..');

msb
  .channelManager
  .findOrCreateConsumer('test:pubsub:routing-key', { type: 'topic', bindingKeys: '#', groupId: false})
  .on('message', function(message) {
    console.log('subAll:' + message.payload.body.i);
  })
  .on('error', console.error);
