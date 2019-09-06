'use strict';
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('msb:channelManager');
var validateWithSchema = require('./validateWithSchema');
var messageFactory = require('./messageFactory');
var helpers = require('./support/helpers');
var logger = require('./support/logger');

var channelManager = exports;

var ADAPTER_PATHS = {
  amqp: './adapters/amqp',
  activemq: './adapters/activemq',
  local: './adapters/local'
};

channelManager.create = function() {
  var channelManager = new EventEmitter();
  var config = require('./config').create();

  var producersByTopic = {};
  var consumersByTopic = {};
  var consumerTopicsToCheck = [];
  var toCheckConsumers = false;
  var adapter;
  var adapterConfig;

  channelManager.PRODUCER_NEW_TOPIC_EVENT = 'newProducerOnTopic';
  channelManager.PRODUCER_REMOVED_TOPIC_EVENT = 'removedProducerOnTopic';
  channelManager.PRODUCER_NEW_MESSAGE_EVENT = 'newProducedMessage';
  channelManager.CONSUMER_NEW_TOPIC_EVENT = 'newConsumerOnTopic';
  channelManager.CONSUMER_REMOVED_TOPIC_EVENT = 'removedConsumerOnTopic';
  channelManager.CONSUMER_NEW_MESSAGE_EVENT = 'newConsumedMessage';

  channelManager.close = function() {
    if (!adapter || !adapter.close) return;
    adapter.close();

    producersByTopic = {};
    consumersByTopic = {};
    consumerTopicsToCheck = [];
    toCheckConsumers = false;
    adapter.removeAllListeners();
    adapter = null;
    adapterConfig = null;
  };

  channelManager.hasChannels = function() {
    return (Object.keys(producersByTopic).length || Object.keys(consumersByTopic).length) > 0;
  };

  channelManager.configure = function(newConfig) {
    if (channelManager.hasChannels()) {
      logger.warn('`configure()` must be called before channels are created.');
    }
    config.configure(newConfig);
    return channelManager;
  };

  channelManager.findOrCreateProducer = function(topic, options, unusedChannelTimeoutMs) {
    var channel = producersByTopic[topic];
    if (channel) return channel;
    options = options ? options : {};

    channel = producersByTopic[topic] = channelManager.createRawProducer(topic, options);

    var unusedChannelTimeout;

    channelManager.emit(channelManager.PRODUCER_NEW_TOPIC_EVENT, topic);

    channel.publish_ = channel.publish;
    channel.publish = function(message, cb) {
      clearTimeout(unusedChannelTimeout);

      if (unusedChannelTimeoutMs) {
        unusedChannelTimeout = setTimeout(onUnusedChannelTimeout, unusedChannelTimeoutMs);
      }

      channel.publish_(message, function(err) {
        if (err) return cb(err);
        channelManager.emit(channelManager.PRODUCER_NEW_MESSAGE_EVENT, topic);
        cb();
      });
    };

    function onUnusedChannelTimeout() {
      removeProducer(channel, topic);
    }

    return channel;
  };

  channelManager.createRawProducer = function(topic, options) {
    helpers.validatedTopic(topic);
    var a = getAdapter(); // Adapter must be loaded before config is used

    var producerConfig = _.merge(adapterConfig, options);

    return a.Publish(producerConfig).channel(topic);
  };

  channelManager.createNewConsumer = function (topic, options) {
    var isServiceChannel = (topic[0] === '_');
    var channel = new EventEmitter();
    channel.raw = channelManager.createRawConsumer(topic, options);
    channel.setMaxListeners(0);

    var autoConfirm;
    if (options && 'autoConfirm' in options) {
      autoConfirm = options.autoConfirm;
    } else {
      autoConfirm = adapterConfig && adapterConfig.autoConfirm;
    }

    channel.onceConsuming = (channel.raw.onceConsuming) ? function(cb) {
      channel.raw.onceConsuming(cb);
      return channel;
    } : noopCb;

    channel.rejectMessage = (channel.raw.rejectMessage) ? function(message) {
      channel.raw.rejectMessage(message);
    } : noop;

    channel.confirmProcessedMessage = (channel.raw.confirmProcessedMessage) ? function(message, _safe) {
      // Only use _safe if you can't know whether message has already been confirmed/rejected
      channel.raw.confirmProcessedMessage(message, _safe);
    } : noop;

    function onMessage(message) {
      if (messageHasExpired(message)) {
        channel.rejectMessage(message);
        return;
      }
      channelManager.emit(channelManager.CONSUMER_NEW_MESSAGE_EVENT, topic);

      if (config.autoMessageContext) messageFactory.startContext(message);
      channel.emit('message', message);
      if (config.autoMessageContext) messageFactory.endContext();

      if (autoConfirm) channel.confirmProcessedMessage(message, true);
    }

    function onValidationError(err, message) {
      channel.rejectMessage(message);
    }

    // Validate with envelope schema
    if (!isServiceChannel && config.schema) {
      channel.raw.on('message', validateWithSchema.onEvent(config.schema, onMessage, onValidationError));
    } else {
      channel.raw.on('message', onMessage);
    }

    channel.on('error', function(err, message) {
      if (autoConfirm && message) {
        // Reject when a message has generated an error, e.g. not validated
        channel.rejectMessage(message);
      }
    });

    channel.raw.on('error', channel.emit.bind(channel, 'error'));

    channelManager.emit(channelManager.CONSUMER_NEW_TOPIC_EVENT, topic);

    if (isServiceChannel || !config.cleanupConsumers) return channel;

    channel.on('removeListener', function(eventName) {
      if (eventName !== 'message') return;
      if (~consumerTopicsToCheck.indexOf(topic) || channel.listeners(eventName).length) return;
      consumerTopicsToCheck.push(topic);

      if (consumerTopicsToCheck.length > 1) return;
      setImmediate(checkConsumers);
    });

    return channel;
  };

  channelManager.findOrCreateConsumer = function(topic, options) {
    var channel = consumersByTopic[topic];
    if (channel) {
      return channel;
    } else {
      channel = consumersByTopic[topic] = channelManager.createNewConsumer(topic, options);
      return channel;
    }
  };

  channelManager.createRawConsumer = function(topic, options) {
    var a = getAdapter(); // Adapter must be loaded before config is used

    var subscriberConfig = _.merge({
      channel: helpers.validatedTopic(topic)
    }, adapterConfig, options);

    return a.Subscribe(subscriberConfig);
  };

  // Backward-compatibility
  channelManager.createProducer = channelManager.createRawProducer;
  channelManager.createConsumer = channelManager.createRawConsumer;

  function getAdapter() {
    if (adapter) return adapter;

    adapterConfig = config[config.brokerAdapter];
    if (!adapterConfig) throw new Error('Invalid broker adapter \'' + config.brokerAdapter + '\'');

    adapter = require(ADAPTER_PATHS[config.brokerAdapter]).create();

    adapter.on('connection', function onConnection() {
      channelManager.emit('connection');
    });
    adapter.on('disconnection', function onDisconnection(e) {
      channelManager.emit('disconnection', e);
    });
    adapter.on('error', function onError(e) {
      channelManager.emit('error', e);
    });

    return adapter;
  }

  function checkConsumers() {
    consumerTopicsToCheck.forEach(function(topic) {
      var channel = consumersByTopic[topic];
      if (channel.listeners('message').length) return; // Still has listeners

      removeConsumer(channel, topic);
    });
    consumerTopicsToCheck = [];
  }

  function removeConsumer(channel, topic) {
    delete(consumersByTopic[topic]);
    channel.raw.close();
    channelManager.emit(channelManager.CONSUMER_REMOVED_TOPIC_EVENT, topic);
  }

  function removeProducer(channel, topic) {
    delete(producersByTopic[topic]);
    channel.close();
    channelManager.emit(channelManager.PRODUCER_REMOVED_TOPIC_EVENT, topic);
  }

  if (process.env.NODE_ENV === 'test') {
    channelManager._producersByTopic = producersByTopic;
    channelManager._consumersByTopic = consumersByTopic;
    channelManager._config = config;
  }

  return channelManager;
};

channelManager.default = channelManager.create();

function messageHasExpired(message) {
  return message.meta && message.meta.ttl &&
    new Date(message.meta.createdAt) < new Date(Date.now() - message.meta.ttl);
}

function noop() {}

function noopCb(cb) {
  cb();
}
