'use strict';
/**
 * This subscriber will alternatively confirm and reject, with random delay in consumption
 */
var msb = require('../..');

const onMessage = function (message, channel) {
  var i = message.payload.body.i;

  if (i % 3) {
    console.log(`deliverConfirm: ${i}`);
    channel.confirmProcessedMessage(message);
  } else {
    console.log(`deliverReject: ${i}`);
    setTimeout(function () {
      channel.rejectMessage(message);
    }, 500);
  }
};

msb.subscriber('test:pubsub')
  .withAutoConfirm(false)
  .subscribe()
  .on('message', onMessage)
  .on('error', console.error);
