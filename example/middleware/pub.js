'use strict';
/**
 * This publisher will emit 10 messages per second
 */
var msb = require('../..');
var messageFactory = msb.messageFactory;
var i = 0;

function sendBroadcast() {
  var message = messageFactory.createBroadcastMessage({
    middlewareNamespace: 'test:pubsub:middleware',
    namespace: 'test:pubsub',
    ttl: 30000 // Optional
  });
  var j = i++;

  message.payload = {
    body: {
      i: j
    }
  };

  messageFactory.completeMeta(message, message.meta);

  msb
    .channelManager
    .findOrCreateProducer(message.topics.to)
    .publish(message, function(err) {
      if (err) return console.error(err);

      console.log('pub:' + j);
    });
}

setInterval(sendBroadcast, 100);
