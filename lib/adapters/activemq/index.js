var _ = require('lodash');
var RheaPublisherAdapter = require('./publisher').RheaPublisherAdapter;
var RheaSubscriberAdapter = require('./subscriber').RheaSubscriberAdapter;
const rhea = require('rhea');
var EventEmitter = require('events').EventEmitter;

var activemq = exports;

activemq._createConnection = function(config) {
  return rhea.connect(config);
};

activemq.create = function() {
  var adapter = new EventEmitter();
  var connection;
  var closed;

  adapter.Publish = function(config) {
    var publisher = new RheaPublisherAdapter(config, sharedClient(config));

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
    return new RheaSubscriberAdapter(config, sharedClient(config));
  };

  adapter.close = function() {
    if (!connection) return;
    closed = true;
    connection.close();
  };

  function sharedClient(config) {
    if (connection) return connection;

    connection = activemq._createConnection(_.clone(config));

    connection.on('connection_open', function() {
      adapter.emit('connection');
    });

    connection.on('connection_close', function(e) {
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
    connection.on('connection_error', function(e) {
      adapter.emit('error', e);
    });
    return connection;
  }

  return adapter;
};
