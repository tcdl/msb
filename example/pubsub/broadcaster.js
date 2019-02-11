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

  messageFactory.completeMeta(message, message.meta);


  var cM = msb
    .channelManager;
  cM.findOrCreateProducer(message.topics.to)
    .publish(message, function(err) {
      if (err) return console.error(err);

      console.log('broadcaster:' + j);
    });
  // cM.on('connection', function () {
  //
  // });


}

setInterval(sendBroadcast, 100);
//
// setTimeout(function () {
//
// }, 10000)

module.test.exports = async function publish(confirmation) {
  const logger = commonLogger.child({correlationId: confirmation.headers['tc-correlation-id']});
  const message = msb.messageFactory
    .createBroadcastMessage({namespace: process.env.CONFIRM_NAMESPACE});
  message.payload = confirmation;

  return new Promise((resolve, reject) => {
    msb.channelManager.findOrCreateProducer(process.env.CONFIRM_NAMESPACE, {})
      .publish(message, err => {
        if (err) {
          logger.err({err}, 'Failed to publish confirmation');
          return reject(err);
        } else {
          logger.info({pub: mask(message.payload)}, 'Send a message');
          resolve();
        }
      });
  });
};
