'use strict';
// $lab:coverage:off$
var EventEmitter = require('events').EventEmitter;
var redis = require('redis');
var debug = require('debug')('msb:broker');
var queue = exports;

queue.create = function(config) {
  var queue = new EventEmitter();
  var publisherClient;
  var subscriberClient;
  var connectionTimeout;

  queue.Publish = function(config) {
    publisherClient = publisherClient || createClient(config);
    publisherClient.on('error', debug);

    return {
      channel: function(channel) {
        return {
          publish: function(message, cb) {
            publisherClient.publish(channel, JSON.stringify(message), cb);
          },
          close: _noop
        };
      }
    };
  };

  queue.Subscribe = function(config) {
    subscriberClient = subscriberClient || createClient(config);
    subscriberClient

    var emitter = new EventEmitter();

    function onClientMessage(channel, message) {
      if (channel !== config.channel) return;
      process.nextTick(function() {
        var parsedMessage;
        try {
          parsedMessage = JSON.parse(message);
        } catch (e) {
          emitter.emit('error', e);
          return;
        }
        emitter.emit('message', parsedMessage);
      });
    }

    subscriberClient.on('message', onClientMessage);
    subscriberClient.on('error', debug);
    subscriberClient.on('error', emitter.emit.bind(emitter, 'error'));
    subscriberClient.on('end', emitter.emit.bind(emitter, 'end'));

    emitter.close = function() {
      subscriberClient.removeListener('message', onClientMessage);
      subscriberClient.unsubscribe(config.channel);
    };

    subscriberClient.subscribe(config.channel);

    return emitter;
  };

  function createClient(config) {
    var client = redis.createClient(config.port, config.host, config.options);
    client.setMaxListeners(0);
    client.on('reconnecting', function() {
      setConnectionTimeout();
    });
    client.on('ready', function() {
      clearTimeout(connectionTimeout);
    });
    setConnectionTimeout();
    return client;
  }

  function setConnectionTimeout() {
    clearTimeout(connectionTimeout);
    connectionTimeout = setTimeout(queue.emit.bind(queue, 'connectionTimeout'), config.connectionTimeoutMs);
  }

  return queue;
};

function _noop() {}
// $lab:coverage:on$
