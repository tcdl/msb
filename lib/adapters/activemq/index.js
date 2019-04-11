var _ = require('lodash');
var STOMPPublisherAdapter = require('./publisher').STOMPPublisherAdapter;
var STOMPSubscriberAdapter = require('./subscriber').STOMPSubscriberAdapter;
var stompit = require('stompit');
var EventEmitter = require('events').EventEmitter;

var activemq = exports;

activemq._createConnection = function(config) {
  return stompit.connect(config);
};

activemq.create = function() {
  var adapter = new EventEmitter();
  var connection;
  var closed;

  adapter.Publish = function(config) {
    var publisher = new STOMPPublisherAdapter(config, sharedClient(config));

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
    return new STOMPSubscriberAdapter(config, sharedClient(config));
  };

  adapter.close = function() {
    if (!connection) return;
    closed = true;
    connection.disconnect();
  };

  function sharedClient(config) {
    if (connection) return connection;

    connection = activemq._createConnection(_.clone(config));

    connection.on('connect', function() {
      connection.connected = true;
      adapter.emit('connection');
    });

      // connection.setMaxListeners(50); // NOTE stompit does not have setMaxListeners in docs. TODO find out if we need it
      // Although it has channel pool and maxChannels http://gdaws.github.io/node-stomp/api/channel-pool/


      // TODO reconnect logic should be here
      // We need to use stompit.ConnectFailover for reconnect
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
