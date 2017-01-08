/**
 * This subscriber will receive all messages published
 */
var msb = require('../..');

const subscriber = msb.subscriber('test:pubsub').build();

subscriber.subscribe()
  .on('message', function (message) {
    console.log(`deliverAll: ${message.payload.body.i}`);
  })
  .on('error', console.error);
