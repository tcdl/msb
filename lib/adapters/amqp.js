'use strict';
// module.exports = require('message-queue')('redis');
var EventEmitter = require('events').EventEmitter;
var amqp = require('amqp');
var queue = exports;

queue.Publish = function(config) {
  var connection = createdConnection(config);

  return {
    channel: function(channel) {
      var exchange;

      return {
        publish: function(message, cb) {
          whenConnectionReady(connection, function() {
            if (!exchange) {
              exchange = connection.exchange(channel, { type: 'fanout' });
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
  var connection = createdConnection(config);
  var exchange;
  var queue;
  var queueConsumerTag;

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
    if (queueConsumerTag) queue.unsubscribe(queueConsumerTag);
  };

  whenConnectionReady(connection, function() {
    connection.exchange(config.channel, { type: 'fanout' }, function(readyExchange) {
      exchange = readyExchange;
      var queueName = config.channel + '.' + config.groupId;

      connection.queue(queueName, { durable: true }, function(readyQueue) {
        queue = readyQueue;
        queue.bind(exchange, '');
        queue.subscribe({}, onMessage).addCallback(function(ok) {
          queueConsumerTag = ok.consumerTag;
        });
      });
    });
  });

  return emitter;
};

var connection;

function createdConnection(config) {
  connection = connection || amqp.createConnection(config);
  connection.setMaxListeners(0);
  // connection.on('error', console.error);
  return connection;
}

function whenConnectionReady(connection, fn) {
  if (connection.readyEmitted) return process.nextTick(fn);
  connection.once('ready', fn);
}

function _noop() {}
