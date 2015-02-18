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
  subscriberClient.subscribe(config.channel);

  var emitter = new EventEmitter();

  function onClientMessage(channel, message) {
    if (channel !== config.channel) return;
    emitter.emit('message', JSON.parse(message));
  }

  subscriberClient.on('message', onClientMessage);

  emitter.close = function() {
    subscriberClient.removeListener('message', onClientMessage);
    subscriberClient.unsubscribe(config.channel);
  };

  return emitter;
};

function _noop() {}
