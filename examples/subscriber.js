'use strict';
var msb = require('..');
var validateWithSchema = msb.validateWithSchema;
var channelManager = msb.channelManager;

var messageSchema = {
  payload: {
    type: 'string'
  }
};

var onMessageFn = validateWithSchema.onEvent(messageSchema, function(message) {
  console.log(message);
});

channelManager
.findOrCreateConsumer('test:pubsub', { groupId: false })
.on('message', onMessageFn)
.on('error', function(err) {
  console.error(err);
});
