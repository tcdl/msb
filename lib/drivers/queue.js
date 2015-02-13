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
        publish: publisherClient.publish.bind(publisherClient, channel)
      };
    }
  };
};

queue.Subscribe = function(config) {
  subscriberClient = subscriberClient || redis.createClient(config);
  subscriberClient.subscribe(config.channel);

  var emitter = new EventEmitter();
  subscriberClient.on('message', function(channel, message) {
    if (channel !== config.channel) return;
    emitter.emit('message', JSON.parse(message));
  });
  return emitter;
};
