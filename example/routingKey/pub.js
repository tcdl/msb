'use strict';
/**
 * This publisher will emit 10 messages per second
 */
var msb = require('../..');
var messageFactory = msb.messageFactory;
var i = 0;

function sendBroadcast() {
  var message = messageFactory.createBroadcastMessage({
    namespace: 'test:pubsub:routing-key',
    ttl: 30000 // Optional
  });
  var j = i++;

  message.payload = {
    body: {
      i: j
    }
  };

  message.topics.routingKey = j % 2 ? 'odd' : 'even';

  messageFactory.completeMeta(message, message.meta);

  msb
    .channelManager
    .findOrCreateProducer(message.topics.to, { type: 'topic' })
    .publish(message, function(err) {
      if (err) return console.error(err);

      console.log('pub:' + j);
    });
}

setInterval(sendBroadcast, 100);
