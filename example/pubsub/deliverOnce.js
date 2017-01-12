'use strict';
/**
 * This subscriber will receive all messages published
 */
var msb = require('../..');

msb.subscriber('test:pubsub')
  .withGroupId('example-string')
  .createEmitter()
  .on('message', function (message) {
    console.log(`deliverOnce: ${message.payload.body.i}`);
  })
  .on('error', console.error);
