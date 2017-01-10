/**
 * This subscriber will receive all messages published
 */
var msb = require('../..');

msb.subscriber('test:pubsub').subscribe()
  .on('message', function (message) {
    console.log(`deliverAll: ${message.payload.body.i}`);
  })
  .on('error', console.error);
