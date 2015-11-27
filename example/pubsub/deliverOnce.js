'use strict';
/**
 * This subscriber will receive all messages published
 */
var msb = require('../..');

msb
.channelManager
.findOrCreateConsumer('test:pubsub', {
  groupId: 'example-string'
})
.on('message', function(message) {
  console.log('deliverOnce:' + message.payload.body.i, '(' + process.pid + ')');
})
.on('error', console.error);
