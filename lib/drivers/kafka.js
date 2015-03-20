'use strict';
var async = require('async');
var _ = require('lodash');
var debug = require('debug')('msb:queue');
var kafka = require('kafka-node');
var Client = kafka.Client;
var Offset = kafka.Offset;
var HighLevelProducer = kafka.HighLevelProducer;
var HighLevelConsumer = kafka.HighLevelConsumer;
var EventEmitter = require('events').EventEmitter;
var queue = exports;

queue.Publish = function(config) {
  var client = new Client(config.kafkaConnectionString); // Clients have side-effects when re-used
  var producer = new HighLevelProducer(client);

  return {
    channel: function(channel) {
      var topic = channel.replace(/:/g, '_');
      var queue = [];

      producer.on('ready', function() {
        if (!queue.length) return;

        var processingQueue = queue;
        queue = [];

        var i = processingQueue.length;
        while(i-- > 0) {
          sendMessage.apply(null, processingQueue.shift());
        }
      });

      function sendMessage(message, cb, retries) {
        if (!producer.ready) {
          queue.push(arguments);
          return;
        }
        debug(message);
        producer.send([{
          topic: topic,
          messages: message
        }], function(err) {
          if (err && err.length && (err[0] !== 'LeaderNotAvailable' || retries === 0)) return cb(new Error(err[0]));
          if (!err || !err.length) return cb();

          setTimeout(function() {
            debug(err[0], retries);
            sendMessage(message, cb, (retries || 5) - 1);
          }, 200);
        });
      }

      return {
        publish: sendMessage,
        close: _noop
      };
    }
  };
};

queue.Subscribe = function(config) {
  var topic = config.channel.replace(/:/g, '_');
  var emitter = new EventEmitter();

  createConsumer(config.kafkaConnectionString, [topic], config.kafkaConsumerOptions, emitter, 5);

  return emitter;
};

function createConsumer(connectionString, topics, options, emitter, retries) {
  var client = new Client(connectionString); // Clients have side-effects when re-used

  whenClientReady(client, function() {
    // Sync method to ensure the topics exist
    client.createTopics(topics, false, function(err) {
      if (err) return emitter.emit('error', err);

      var consumer = new HighLevelConsumer(client, topics, options);

      consumer.setMaxListeners(0);
      consumer.on('message', function onMessage(message) {
        debug(message);
        process.nextTick(function() {
          emitter.emit('message', JSON.parse(message.value));
        });
      });
      consumer.on('error', function(err) {
        if (retries < 1 && err.name !== 'FailedToRebalanceConsumerError') return emitter.emit('error', err);

        consumer.removeAllListeners();
        consumer.close(function() {
          debug('creating consumer', err);
          createConsumer(connectionString, topics, options, emitter, --retries);
        });
      });
      consumer.on('offsetOutOfRange', function(topicInfo) {
        var offset = new Offset(client);

        topicInfo.maxNum = 2;

        offset.fetch([topicInfo], function(err, offsets) {
          if (err) return debug(err);

          var min = Math.min.apply(null, offset[topicInfo.topic][topicInfo.partition]);
          consumer.setOffset(topicInfo.topic, topicInfo.partition, min);
        });
      });

      emitter.close = function() {
        // Note: doesn't work well
        // emitter.removeAllListeners();
        // consumer.removeAllListeners();
        // consumer.close(_noop);
      };
    });
  });
}

function whenClientReady(client, fn) {
  if (client.ready) return fn();
  client.once('ready', fn);
}

function _noop() {}
