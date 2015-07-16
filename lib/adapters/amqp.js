'use strict';
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var AMQP = require('amqp-coffee');
var debug = require('debug')('msb:broker');
var generateId = require('../support/generateId');
var queue = exports;

var DURABLE_QUEUE_OPTIONS = { durable: true, autodelete: false, passive: false };
var TRANSIENT_QUEUE_OPTIONS = { passive: false };

queue.Publish = function(config) {
  var connection = createdConnection(config);

  return {
    channel: function(name) {
      var exchange;

      return {
        publish: function(message, cb) {
          var messageStr = JSON.stringify(message); // Prevent mutation beyond this tick

          whenConnectionReady(connection, function(err) {
            if (err) return cb(err);

            function onExchangeReady() {
              connection.publish(name, '', messageStr, { deliveryMode: 2, confirm: true }, cb);
            }

            if (!exchange) {
              exchange = connection.exchange({
                exchange: name,
                type: 'fanout'
              });
              exchange.declare(onExchangeReady);
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
  var consumer;

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
    consumer.close();
    connection.removeListener('ready', init);
  };

  emitter.on('error', console.error);

  function init(err) {
    // Ensure topology is redeclared on reconnect
    connection.on('ready', init);

    var exchange = connection.exchange({ exchange: config.channel, type: 'fanout' });
    var queueOptions = _.clone((config.durable) ? DURABLE_QUEUE_OPTIONS : TRANSIENT_QUEUE_OPTIONS);
    var queueSuffix = '.' + (config.groupId || generateId()) + '.' + ((config.durable) ? 'd' : 't');
    var queueName = queueOptions.queue = config.channel + queueSuffix;

    queueOptions.exclusive = !config.groupId;

    exchange.declare(function(err) {
      if (err) return emitter.emit('error', err);

      var queue = connection.queue(queueOptions);
      queue.declare(queueOptions, function(err) {
        if (err) return emitter.emit('error', err);

        queue.bind(config.channel, '', function(err) {
          if (err) return emitter.emit('error', err);

          if (consumer) {
            consumer.resume();
          } else {
            consumer = connection.consume(queueName, queueOptions, onMessage);
            consumer.on('error', debug);
          }
        });
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
  if (connection) return connection;

  connection = new AMQP(config);
  connection.setMaxListeners(0);
  connection.on('error', debug);
  return connection;
}

function whenConnectionReady(connection, fn) {
  if (connection.state === 'open') return process.nextTick(fn);

  var timeout = setTimeout(function() {
    connection.removeListener('ready', onReadyFn);
    fn(new Error('AMQP connection timeout'));
  }, 10000);

  var onReadyFn = function() {
    debug('connection ready');
    clearTimeout(timeout);
    fn();
  };

  connection.once('ready', onReadyFn);
}

function _noop() {}
