var generateId = require('../../support/generateId');
var _ = require('lodash');
var STOMPPublisherAdapter = require('./publisher').STOMPPublisherAdapter;
var STOMPSubscriberAdapter = require('./subscriber').STOMPSubscriberAdapter;
var stompit = require('stompit');
var EventEmitter = require('events').EventEmitter;

var activemq = exports;

activemq._createConnection = function(config) {
  var connection = new EventEmitter();
  connection.id = generateId();
  console.log('connectionID:', connection.id);

  connection.disconnect = function () {
    if(this.client) {
      console.log('DISCONNECT');
      this.client.disconnect();
    }

    if (this.channelFactory) {
      console.log("CLOSE CHANNEL POOL");
      this.channelFactory.close();
    }
  };

  connection.subscribe = function (headers, callback) {
    console.log("SUBSCRIBE");

    this.channelFactory.channel(function (error, channel) {
      if (error) {
        console.log('channel factory error: ' + error.message);
        return;
      }
      console.log('clientID:', _.get(channel, '_client.headers.session'));
      connection.channel = channel;

      var client1 = channel.subscribe(headers, callback);
      connection.client1 = client1;
    });
  };

  connection.send = function (headers, message, cb) {
    console.log("SENDING");

    this.channelFactory.channel(function (error, channel) {
      if (error) {
        console.log('channel factory error: ' + error.message);
        return;
      }

      channel.send(headers, message, function (error) {
        if (error) {
          console.log('failed to send');
          return;
        }
        cb();
      });


    });
  };

  connection.ack = function (message) {
    console.log('ACK message:', message.headers.ack);
    message.ack();
    //this.client.ack(message);
    //this.client1.ack(message);
  };

  //return stompit.connect(config);

  var connectFailover = new stompit.ConnectFailover([config]);
  var channelFactory = new stompit.ChannelFactory(connectFailover);
  //var channelPool = stompit.ChannelPool(connectFailover);

  connection.connectFailover = connectFailover;
  connection.channelFactory = channelFactory;
  //connection.channelPool = channelPool;

  connection.emit('connect');

  connectFailover.connect(function (error, client, reconnect) {
    if (error) return error;

    console.log("CONNECT");

    //connection.client = client;
    connection.reconnect = reconnect;
    connection.emit('connect');

    console.log('clientID 1111:', _.get(client, '_client.headers.session'));
/*
    console.log('error', error);
    console.log('client', client);
    console.log('reconnect', reconnect);
*/
  });

  return connection;
};

activemq.create = function() {
  var adapter = new EventEmitter();
  var connection;
  var reconnect;
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
      console.log('on connect');

      connection.connected = true;
      adapter.emit('connection');
    });

    connection.on('connection', function() {
      console.log('on connect');

      connection.connected = true;
      adapter.emit('connection');
    });

      // connection.setMaxListeners(50); // NOTE stompit does not have setMaxListeners in docs. TODO find out if we need it
      // Although it has channel pool and maxChannels http://gdaws.github.io/node-stomp/api/channel-pool/


      // TODO reconnect logic should be here
      // We need to use stompit.ConnectFailover for reconnect
    connection.on('close', function(e) {
      console.log('on close', e);
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
      console.log('on error', e);
      adapter.emit('error', e);
    });
    return connection;
  }

  return adapter;
};
