var EventEmitter = require('events').EventEmitter;
var nsq = require('nsqjs');
var serviceDetails = require('../support/serviceDetails');

var nsqAdapter = exports;

var connection;

nsqAdapter.Publish = function(config) {
  var publisher = new nsq.Writer(config.host, 4150, {});

  publisher.connect();

  return {
    channel: function(topic) {
      var nsqTopic = topic.replace(/\:/g, '_');
      return {
        publish: function(message, cb) {
          publisher.publish(nsqTopic, JSON.stringify(message), cb);
        },
        close: publisher.close.bind(publisher)
      };
    }
  };
};

nsqAdapter.Subscribe = function(config) {
  var nsqTopic = config.channel.replace(/\:/g, '_');

  var options = {
    lookupdHTTPAddresses: config.host + ':' + 4161
  };

  var subscriber = new nsq.Reader(nsqTopic, (config.groupId || serviceDetails.instanceId), options);

  subscriber.connect();

  var emitter = new EventEmitter();

  subscriber.on('message', function(rawMessage) {
    var message = JSON.parse(rawMessage.body.toString());
    emitter.emit('message', message);
    rawMessage.finish();
  });

  emitter.close = function() {
    subscriber.close();
  };

  return emitter;
};
