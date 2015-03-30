var EventEmitter = require('events').EventEmitter;
var simple = require('simple-mock');

var mockChannels = exports;

mockChannels.bus = new EventEmitter();

mockChannels.createProducer = function(topic) {
  return {
    publish: function(message, cb) {
      var clonedMessage = JSON.parse(JSON.stringify(message));

      process.nextTick(function() {
        mockChannels.bus.emit(topic, clonedMessage);
        cb();
      });
    }
  };
};

mockChannels.createConsumer = function(topic) {
  var channel = new EventEmitter();

  mockChannels.bus.on(topic, function(message){
    channel.emit('message', message);
  });

  return channel;
};
