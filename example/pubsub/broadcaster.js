'use strict';
/**
 * This broadcaster will emit 10 messages per second
 */
var msb = require('../..');
var messageFactory = msb.messageFactory;
var i = 0;

function sendBroadcast() {
  var message = messageFactory.createBroadcastMessage({
    namespace: 'test:pubsub',
    ttl: 30000 // Optional
  });
  var j = i++;

  message.payload = {
    body: {
      i: j
    }
  };

  msb
  .channelManager
  .findOrCreateProducer(message.topics.to)
  .publish(message, function(err) {
    if (err) return console.error(err);

    console.log('broadcaster:' + j);
  });
}

setInterval(sendBroadcast, 100);
