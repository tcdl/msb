'use strict';
var argv = require('minimist')(process.argv.slice(2));
var msb = require('..');
var messageFactory = msb.messageFactory;
var channelManager = msb.channelManager;

var message = messageFactory.createBroadcastMessage({
  namespace: 'test:pubsub',
  ttl: 30000
});

message.payload = argv.payload;

channelManager
.findOrCreateProducer(message.topics.to)
.publish(message, function(err) {
  if (err) return console.error(err);

  process.exit();
});
