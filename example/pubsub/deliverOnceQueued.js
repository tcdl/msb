'use strict';
/**
 * This subscriber will receive all messages published
 */
var msb = require('../..');

msb
.channelManager
.findOrCreateConsumer('test:pubsub', {
  groupId: 'example-string-alt',
  durable: true
})
.on('message', function(message) {
  console.log('deliverOnceQueued:' + message.payload.body.i);
})
.on('error', console.error);
