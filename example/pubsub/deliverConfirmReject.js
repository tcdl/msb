'use strict';
/**
 * This subscriber will alternatively confirm and reject, with random delay in consumption
 */
var msb = require('../..');

var consumer = msb
.channelManager
.findOrCreateConsumer('test:pubsub', {
  autoConfirm: false
})
.on('message', function(message) {
  var i = message.payload.body.i;
  if (i % 3) {
    console.log('deliverConfirm:' + i, '(' + process.pid + ')');
    consumer.confirmProcessedMessage(message);
  } else {
    console.log('deliverReject:' + i, '(' + process.pid + ')');
    setTimeout(function() {
      consumer.rejectMessage(message);
    }, 500);
  }
})
.on('error', console.error);
