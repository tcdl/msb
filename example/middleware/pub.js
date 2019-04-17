'use strict';
/**
 * This publisher will emit 1 message per second
 */
process.env.MSB_BROKER_ADAPTER = 'activemq';

/*process.env.MSB_BROKER_HOST = 'b-d0161bb0-710d-4481-a386-ae36528464b6-1.mq.us-east-2.amazonaws.com';
process.env.MSB_BROKER_PORT = '61614';
process.env.MSB_BROKER_USE_SSL = 'true';
process.env.MSB_AMQP_VHOST = '/';
process.env.MSB_BROKER_USER = 'admin1';
process.env.MSB_BROKER_PASS = 'admin1admin2';*/

var msb = require('../..');
var messageFactory = msb.messageFactory;
var i = 0;

function sendBroadcast() {
  var message = messageFactory.createBroadcastMessage({
    namespace: 'test:activemq',
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

setInterval(sendBroadcast, 1000);
