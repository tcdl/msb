var EventEmitter = require('events').EventEmitter;

var mockChannels = exports;

mockChannels.bus = new EventEmitter();

mockChannels.createRawProducer = function(topic) {
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

mockChannels.createRawConsumer = function(topic) {
  var channel = new EventEmitter();

  function onMessage(message) {
    channel.emit('message', message);
  }

  mockChannels.bus.on(topic, onMessage);

  channel.close = function() {
    mockChannels.bus.removeListener('message', onMessage);
  };

  return channel;
};
