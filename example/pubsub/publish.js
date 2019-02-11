var msb = require('../..');
// const {commonLogger, mask} = require('../logger');

async function publish(confirmation) {
  // const logger = commonLogger.child({correlationId: confirmation.headers['tc-correlation-id']});
  const message = msb.messageFactory
    .createBroadcastMessage({namespace: 'test:pubsub'});
  message.payload = confirmation;

  return new Promise((resolve, reject) => {
    msb.channelManager.findOrCreateProducer('test:pubsub', {})
      .publish(message, err => {
        if (err) {
          console.log('Failed to publish confirmation');
          return reject(err);
        } else {
          // logger.info({pub: mask(message.payload)}, 'Send a message');
          console.log('sent');
          resolve();
        }
      });
  });
}

publish({message: 'something'});
