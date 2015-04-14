'use strict';
// module.exports = require('message-queue')('redis');
var EventEmitter = require('events').EventEmitter;
var amqp = require('amqp');
var queue = exports;

var publisherConnection;
var subscriberConnection;

queue.Publish = function(config) {
  publisherConnection = publisherConnection || amqp.createConnection(config);

  return {
    channel: function(channel) {
      var exchange;

      return {
        publish: function(message, cb) {
          whenConnectionReady(publisherConnection, function() {
            if (!exchange) {
              exchange = publisherConnection.exchange(channel, { type: 'fanout' });
            }

            exchange.publish('', JSON.stringify(message), { mandatory: true });
            cb();
          });
        },
        close: _noop
      };
    }
  };
};

queue.Subscribe = function(config) {
  subscriberConnection = subscriberConnection || amqp.createConnection(config);
  subscriberConnection.setMaxListeners(0);

  var exchange;
  var queue;

  var emitter = new EventEmitter();
  emitter.setMaxListeners(0);

  function onMessage(envelope) {
    var message = envelope.data.toString();

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

  emitter.close = function() {
    if (queue) queue.destroy();
    if (exchange) exchange.destroy();
  };

  subscriberConnection.on('error', console.error);

  whenConnectionReady(subscriberConnection, function() {
    subscriberConnection.exchange(config.channel, { type: 'fanout' }, function(readyExchange) {
      exchange = readyExchange;
      var queueName = config.channel + '.' + config.groupId;

      subscriberConnection.queue(queueName, { durable: true }, function(readyQueue) {
        queue = readyQueue;
        queue.bind(exchange, '');
        queue.subscribe({}, onMessage);
      });
    });
  });

  return emitter;
};

function whenConnectionReady(connection, fn) {
  if (connection.readyEmitted) return process.nextTick(fn);
  connection.once('ready', fn);
}

function _noop() {}
