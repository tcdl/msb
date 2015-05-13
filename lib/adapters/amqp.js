'use strict';
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var amqp = require('amqp');
var generateId = require('../support/generateId');
var queue = exports;

var DURABLE_QUEUE_OPTIONS = { durable: true, autoDelete: false, closeChannelOnUnsubscribe: true };
var TRANSIENT_QUEUE_OPTIONS = { closeChannelOnUnsubscribe: true };

queue.Publish = function(config) {
  var connection = createdConnection(config);

  return {
    channel: function(channel) {
      var exchange;

      return {
        publish: function(message, cb) {
          whenConnectionReady(connection, function(err) {
            if (err) return cb(err);

            function onExchangeReady() {
              exchange.publish('', JSON.stringify(message), { deliveryMode: 2 }); // Assume persistent for all messages
              // This private API is possibly the only way to delay the callback until socket buffer has been flushed
              // if (connection.socket._writableState && connection.socket._writableState.needDrain) {
              //   return connection.once('drain', cb);
              // }
              cb();
            }

            if (!exchange) {
              exchange = connection.exchange(channel, { type: 'fanout' }, onExchangeReady);
              return;
            }

            onExchangeReady();
          });
        },
        close: _noop
      };
    }
  };
};

queue.Subscribe = function(config) {
  var connection = createdConnection(config);
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
    if (queueConsumerTag) { queue.unsubscribe(queueConsumerTag); }
  };

  function onceCloseFn() {
    emitter.close();
    connection.readyEmitted = false;
    setTimeout(initWhenConnectionReady, 1000);
  }

  function init(err) {
    if (err) {
      console.error(err);
      return initWhenConnectionReady();
    }

    connection.once('close', onceCloseFn);

    var exchange = connection.exchange(config.channel, { type: 'fanout' });
    var queueOptions = _.clone((config.durable) ? DURABLE_QUEUE_OPTIONS : TRANSIENT_QUEUE_OPTIONS);
    var queueSuffix = '.' + (config.groupId || generateId()) + '.' + ((config.durable) ? 'd' : 't');
    var queueName = config.channel + queueSuffix;

    queueOptions.exclusive = !config.groupId;

    connection.queue(queueName, queueOptions, function(readyQueue) {
      queue = readyQueue;
      queue.bind(exchange, '');

      if (queueConsumerTag) return;
      queue.subscribe({}, onMessage).addCallback(function(ok) {
        queueConsumerTag = ok.consumerTag;
        exchange.close(); // Only need it to set up the binding
      });
    });
  }

  function initWhenConnectionReady() {
    whenConnectionReady(connection, init);
  }

  initWhenConnectionReady();
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

  var timeout = setTimeout(function() {
    connection.removeListener('ready', onReadyFn);
    fn(new Error('AMQP connection timeout'));
  }, 10000);

  var onReadyFn = function() {
    clearTimeout(timeout);
    fn();
  };

  connection.once('ready', onReadyFn);
}

function _noop() {}
