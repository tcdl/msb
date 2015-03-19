'use strict';
// module.exports = require('message-queue')('redis');
var EventEmitter = require('events').EventEmitter;
var redis = require('redis');
var queue = exports;

var publisherClient;
var subscriberClient;

queue.Publish = function(config) {
  publisherClient = publisherClient || redis.createClient(config);
  return {
    channel: function(channel) {
      return {
        publish: publisherClient.publish.bind(publisherClient, channel),
        close: _noop
      };
    }
  };
};

queue.Subscribe = function(config) {
  subscriberClient = subscriberClient || redis.createClient(config);
  subscriberClient.setMaxListeners(0);

  var emitter = new EventEmitter();

  function onClientMessage(channel, message) {
    if (channel !== config.channel) return;
    process.nextTick(function() {
      emitter.emit('message', JSON.parse(message));
    });
  }

  subscriberClient.on('message', onClientMessage);
  subscriberClient.on('error', emitter.emit.bind(emitter, 'error'));
  subscriberClient.on('end', emitter.emit.bind(emitter, 'end'));

  emitter.close = function() {
    subscriberClient.removeListener('message', onClientMessage);
    subscriberClient.unsubscribe(config.channel);
  };

  subscriberClient.subscribe(config.channel);

  return emitter;
};

function _noop() {}
