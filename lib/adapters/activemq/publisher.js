var generateDestination = require('./utils').generateDestination;

function RheaPublisherAdapter(config, client) {
  this.config = config;
  this.client = client;
  this.senders = {};
}

var publisher = RheaPublisherAdapter.prototype;

publisher.close = function () {
  this.client.disconnect();
};

publisher.publish = function (topic, message, cb) {
  var messageStr = JSON.stringify(message);
  var routingKey = message.topics && message.topics.routingKey ? message.topics.routingKey : '';

  this._publishMessageStr(topic, messageStr, routingKey, cb);
};

publisher._publishMessageStr = function (topic, messageStr, routingKey, cb) {

  var destination = generateDestination(`topic://VirtualTopic.${topic}`, routingKey);
  var sender = this.senders[destination];
  if (!sender) {
    sender = this.client.open_sender(destination);
    this.senders[destination] = sender;
  }

  sender.send({body: messageStr});
  cb();
};

exports.RheaPublisherAdapter = RheaPublisherAdapter;
