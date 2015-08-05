var AMQPPublisher = require('./publisher').AMQPPublisher;
var AMQPSubscriber = require('./subscriber').AMQPSubscriber;
var AMQP = require('amqp-coffee');

var amqp = exports;

var connection;

amqp.Publish = function(config) {
  var publisher = new AMQPPublisher(config, sharedConnection(config));

  return {
    channel: function(topic) {
      return {
        publish: publisher.publish.bind(publisher, topic),
        close: publisher.close.bind(publisher)
      };
    }
  };
};

amqp.Subscribe = function(config) {
  return new AMQPSubscriber(config, sharedConnection(config));
};

function sharedConnection(config) {
  if (connection) return connection;

  connection = new AMQP(config);
  connection.setMaxListeners(0);
  return connection;
}
