var generateDestination = require('./utils').generateDestination;

function STOMPPublisherAdapter(config, client) {
  this.config = config;
  this.client = client;
}

var publisher = STOMPPublisherAdapter.prototype;

publisher.close = function () {
  this.client.disconnect();
};

publisher.publish = function (topic, message, cb) {
  var messageStr = JSON.stringify(message);
  var routingKey = message.topics && message.topics.routingKey ? message.topics.routingKey : '';

  this._publishMessageStr(topic, messageStr, routingKey, cb);
};

publisher._publishMessageStr = function (topic, messageStr, routingKey, cb) {
  var self = this;

  var sendHeaders = {
    'destination': generateDestination(`/topic/VirtualTopic.${topic}`, routingKey),
    'content-type': 'text/plain',
  };

  if (self.client.connected) {
    sendMessage(self.client, sendHeaders, messageStr, cb);
  } else {
    self.client.on('connect', function () {
      sendMessage(self.client, sendHeaders, messageStr, cb);
    });
  }

  function sendMessage(client, headers, message, cb) {
    var frame = client.send(headers);
    frame.write(message);
    frame.end();
    cb();
  }
};

exports.STOMPPublisherAdapter = STOMPPublisherAdapter;
