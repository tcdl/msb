function STOMPPublisherAdapter(config, client) {
  this.config = config;
  this.client = client;
  this._exchangeByTopic = {};
}

var publisher = STOMPPublisherAdapter.prototype;

publisher.close = function () {
  // Do nothing
};

publisher.publish = function (topic, message, cb) {
  var messageStr = JSON.stringify(message);
  var routingKey = message.topics && message.topics.routingKey ? message.topics.routingKey : '';

  this._publishMessageStr(topic, messageStr, routingKey, cb);
};

publisher._publishMessageStr = function (topic, messageStr, routingKey, cb) {
  var self = this;

  //todo: add routing keys to destinations

  console.log('topic: ' + topic);

  var sendHeaders = {
   // 'destination': `/topic/VirtualTopic.${topic}`,
    'destination': `/topic/VirtualTopic.${topic}`,
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
    cb(); //todo: check why callback is needed
    console.log('message sent');
  }
};

exports.STOMPPublisherAdapter = STOMPPublisherAdapter;
