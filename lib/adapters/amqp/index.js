var _ = require('lodash');
var AMQPPublisherAdapter = require('./publisher').AMQPPublisherAdapter;
var AMQPSubscriberAdapter = require('./subscriber').AMQPSubscriberAdapter;
var AMQP = require('amqp-coffee');
var EventEmitter = require('events').EventEmitter;

var amqp = exports;

amqp._createConnection = function(config) {
  return new AMQP(config);
};

amqp.create = function() {
  var adapter = Object.create(new EventEmitter());
  var connection;
  var closed;

  adapter.Publish = function(config) {
    var publisher = new AMQPPublisherAdapter(config, sharedConnection(config));

    return {
      channel: function(topic) {
        return {
          publish: publisher.publish.bind(publisher, topic),
          close: publisher.close.bind(publisher)
        };
      }
    };
  };

  adapter.Subscribe = function(config) {
    return new AMQPSubscriberAdapter(config, sharedConnection(config));
  };

  adapter.close = function() {
    if (!connection) return;
    closed = true;
    connection.close();
  };

  function sharedConnection(config) {
    if (connection) return connection;

    connection = amqp._createConnection(_.clone(config));
    connection.setMaxListeners(0);
    connection.on('ready', function() {
      adapter.emit('connection');
    });
    connection.on('close', function(e) {
      if (closed) {
        adapter.emit('close', e);
        return;
      }
      if (config.reconnect) {
        adapter.emit('disconnection', e);
      } else {
        adapter.emit('error', e);
      }
    });
    connection.on('error', function(e) {
      adapter.emit('error', e);
    });
    return connection;
  }

  return adapter;
};
