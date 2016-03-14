'use strict';
/**
 * This middleware will receive and resend all messages
 */
var msb = require('../..');

msb
  .channelManager
  .findOrCreateConsumer('test:pubsub:middleware', { groupId: false })
  .on('message', function(message) {
    console.log('middleware:' + message.payload.body.i);

    msb
      .channelManager
      .findOrCreateProducer(message.topics.forward)
      .publish(message, function(err) {
        if (err) return console.error(err);

        console.log('resend:' + message.payload.body.i);
      });
  })
  .on('error', console.error);
