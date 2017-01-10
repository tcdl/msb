/* tslint:disable:typedef */
//todo: refactoring
const _ = require("lodash");
import {EventEmitter} from "events";
const debug = require("debug")("msb:channelManager");
import validateWithSchema = require("./validateWithSchema");
import {create} from "./config";
import * as messageFactory from "./messageFactory";
import * as helpers from "./support/helpers";
import * as logger from "./support/logger";

let channelManager = exports;

const ADAPTER_PATHS = {
  amqp: "./adapters/amqp",
  local: "./adapters/local",
};

channelManager.create = function () {
  let channelManager: any = new EventEmitter();
  let config = create();
  let producersByTopic = {};
  let consumersByTopic = {};
  let consumerTopicsToCheck = [];
  let toCheckConsumers = false;
  let adapter;
  let adapterConfig;

  channelManager.PRODUCER_NEW_TOPIC_EVENT = "newProducerOnTopic";
  channelManager.PRODUCER_REMOVED_TOPIC_EVENT = "removedProducerOnTopic";
  channelManager.PRODUCER_NEW_MESSAGE_EVENT = "newProducedMessage";
  channelManager.CONSUMER_NEW_TOPIC_EVENT = "newConsumerOnTopic";
  channelManager.CONSUMER_REMOVED_TOPIC_EVENT = "removedConsumerOnTopic";
  channelManager.CONSUMER_NEW_MESSAGE_EVENT = "newConsumedMessage";

  channelManager.close = function () {
    if (!adapter || !adapter.close) return;
    adapter.close();
  };

  channelManager.hasChannels = function () {
    return (Object.keys(producersByTopic).length || Object.keys(consumersByTopic).length) > 0;
  };

  channelManager.configure = function (newConfig) {
    if (channelManager.hasChannels()) {
      logger.warn("`configure()` must be called before channels are created.");
    }
    config.configure(newConfig);
    return channelManager;
  };

  channelManager.findOrCreateProducer = function (topic, options, unusedChannelTimeoutMs) {
    let channel = producersByTopic[topic];
    if (channel) return channel;
    options = options ? options : {};

    channel = producersByTopic[topic] = channelManager.createRawProducer(topic, options);

    let unusedChannelTimeout;

    channelManager.emit(channelManager.PRODUCER_NEW_TOPIC_EVENT, topic);

    channel.publish_ = channel.publish;
    channel.publish = function (message, cb) {
      clearTimeout(unusedChannelTimeout);

      if (unusedChannelTimeoutMs) {
        unusedChannelTimeout = setTimeout(onUnusedChannelTimeout, unusedChannelTimeoutMs);
      }

      channel.publish_(message, function (err) {
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

  channelManager.createRawProducer = function (topic, options) {
    const adapter = getAdapter();
    let producerConfig = _.merge(adapterConfig, options);

    return adapter.Publish(producerConfig).channel(helpers.validatedTopic(topic));
  };

  channelManager.findOrCreateConsumer = function (topic, options) {
    let channel = consumersByTopic[topic];
    if (channel) return channel;

    let isServiceChannel = (topic[0] === "_");
    channel = consumersByTopic[topic] = new EventEmitter();
    channel.raw = channelManager.createRawConsumer(topic, options);
    channel.setMaxListeners(0);

    let autoConfirm;
    if (options && "autoConfirm" in options) {
      autoConfirm = options.autoConfirm;
    } else {
      autoConfirm = adapterConfig && adapterConfig.autoConfirm;
    }

    // TODO: is it ok to add custom methods to EventEmitter?
    channel.onceConsuming = (channel.raw.onceConsuming) ? function (cb) {
      channel.raw.onceConsuming(cb);
      return channel;
    } : noopCb;

    channel.rejectMessage = (channel.raw.rejectMessage) ? function (message) {
      channel.raw.rejectMessage(message);
    } : noop__;

    channel.confirmProcessedMessage = (channel.raw.confirmProcessedMessage) ? function (message, _safe) {
      // Only use _safe if you can"t know whether message has already been confirmed/rejected
      channel.raw.confirmProcessedMessage(message, _safe);
    } : noop__;

    function onMessage(message) {
      if (messageHasExpired(message)) {
        channel.rejectMessage(message);
        return;
      }
      channelManager.emit(channelManager.CONSUMER_NEW_MESSAGE_EVENT, topic);

      if (config.autoMessageContext) messageFactory.startContext(message);

      // TODO: emit custom object rather than instance of EventEmitter
      channel.emit("message", message, channel);
      if (config.autoMessageContext) messageFactory.endContext();

      if (autoConfirm) channel.confirmProcessedMessage(message, true);
    }

    function onValidationError(err, message) {
      channel.rejectMessage(message);
    }

    // Validate with envelope schema
    if (!isServiceChannel && config.schema) {
      channel.raw.on("message", validateWithSchema.onEvent(config.schema, onMessage, onValidationError));
    } else {
      channel.raw.on("message", onMessage);
    }

    channel.on("error", function (err, message) {
      if (autoConfirm && message) {
        // Reject when a message has generated an error, e.g. not validated
        channel.rejectMessage(message);
      }
    });

    channel.raw.on("error", channel.emit.bind(channel, "error"));

    channelManager.emit(channelManager.CONSUMER_NEW_TOPIC_EVENT, topic);

    if (isServiceChannel || !config.cleanupConsumers) return channel;

    channel.on("removeListener", function (eventName) {
      if (eventName !== "message") return;
      if (~consumerTopicsToCheck.indexOf(topic) || channel.listeners(eventName).length) return;
      consumerTopicsToCheck.push(topic);

      if (consumerTopicsToCheck.length > 1) return;
      setImmediate(checkConsumers);
    });

    return channel;
  };

  channelManager.createRawConsumer = function (topic, options) {
    let a = getAdapter();

    let subscriberConfig = _.merge({
      channel: helpers.validatedTopic(topic),
    }, adapterConfig, options);

    return a.Subscribe(subscriberConfig);
  };

  // Backward-compatibility
  channelManager.createProducer = channelManager.createRawProducer;
  channelManager.createConsumer = channelManager.createRawConsumer;

  function getAdapter() {
    if (adapter) return adapter;

    adapterConfig = config[config.brokerAdapter];
    if (!adapterConfig) throw new Error("Invalid broker adapter \"" + config.brokerAdapter + "\"");

    adapter = require(ADAPTER_PATHS[config.brokerAdapter]).create();
    return adapter;
  }

  function checkConsumers() {
    consumerTopicsToCheck.forEach(function (topic) {
      let channel = consumersByTopic[topic];
      if (channel.listeners("message").length) return; // Still has listeners

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

  if (process.env.NODE_ENV === "test") {
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

function noop__() {

}

function noopCb(cb) {
  cb();
}
/* tslint:enable:typedef */
