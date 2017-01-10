'use strict';
/**
 *
 * TODO: can we deprecate this one?
 *
 * This will listen on the default adapter and forward to another adapter
 */
var msb = require('../..');

var defaultChannelManager = msb.channelManager;
var forwardToChannelManager = msb.createChannelManager();

forwardToChannelManager.configure({
  brokerAdapter: 'amqp'
});

defaultChannelManager
.findOrCreateConsumer('test:pubsub')
.on('message', function(message) {
  // Forward the entire message
  forwardToChannelManager
  .findOrCreateProducer('test:pubsub')
  .publish(message, function(err) {
    if (err) return console.error(err);

    console.log('forwardOneWay:' + message.payload.body.i)
  });
})
.on('error', console.error);
