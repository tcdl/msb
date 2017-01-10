'use strict';
/**
 * This subscriber will receive all messages published
 */
var msb = require('../..');

msb.subscriber('test:pubsub')
  .withGroupId('example-string-alt')
  .withDurable(true)
  .subscribe()
  .on('message', function (message) {
    console.log(`deliverOnceQueued: ${message.payload.body.i}`);
  })
  .on('error', console.error);
