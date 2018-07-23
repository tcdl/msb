var _ = require('lodash');
var AMQPPublisherAdapter = require('./publisher').AMQPPublisherAdapter;
var AMQPSubscriberAdapter = require('./subscriber').AMQPSubscriberAdapter;
var AMQP = require('amqp-coffee');
var EventEmitter = require('events').EventEmitter;

var amqp = exports;

amqp.create = function () {
  var amqp = Object.create(new EventEmitter());
  var connection;
  var closed;

  amqp.Publish = function (config) {
    var publisher = new AMQPPublisherAdapter(config, sharedConnection(config));

    return {
      channel: function (topic) {
        return {
          publish: publisher.publish.bind(publisher, topic),
          close: publisher.close.bind(publisher)
        };
      }
    };
  };

  amqp.Subscribe = function (config) {
    return new AMQPSubscriberAdapter(config, sharedConnection(config));
  };

  amqp.close = function () {
    if (!connection) return;
    closed = true;
    connection.close();
  };

  function sharedConnection(config) {
    if (connection) return connection;

    connection = new AMQP(_.clone(config));
    connection.setMaxListeners(0);
    connection.on('ready', function () {
      amqp.emit('connection');
    });
    connection.on('close', function (e) {
      if (closed) {
        amqp.emit('close');
        return;
      }
      if (config.reconnect) {
        amqp.emit('disconnection', e);
      } else {
        amqp.emit('error', e);
      }
    });
    return connection;
  }

  return amqp;
};
