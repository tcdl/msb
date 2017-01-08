'use strict';
/**
 * This subscriber will alternatively confirm and reject, with random delay in consumption
 */
var msb = require('../..');

const subscriber = new msb.Subscriber.Builder('test:pubsub')
  .withAutoConfirm(false)
  .build();


let channel = subscriber.subscribe()
  .on('message', function (message) {
    var i = message.payload.body.i;
    if (i % 3) {
      console.log('deliverConfirm:' + i, '(' + process.pid + ')');
      channel.confirmProcessedMessage(message);
    } else {
      console.log('deliverReject:' + i, '(' + process.pid + ')');
      setTimeout(function () {
        channel.rejectMessage(message);
      }, 500);
    }
  })
  .on('error', console.error);
