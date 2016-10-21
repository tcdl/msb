import serviceDetails = require("./support/serviceDetails");
import generateId = require("./support/generateId");
import {msb} from "../msb";
import Message = msb.Message;
import MessageConfig = msb.MessageConfig;
import MessageAck = msb.MessageAck;
import MessagePayload = msb.MessagePayload;
import MessageMeta = msb.MessageMeta;

const _ = require('lodash');
const INSTANCE_ID = serviceDetails.instanceId;

const messageFactory = exports;

let contextMessage: Message = null;

export function createBaseMessage(config?: MessageConfig, originalMessage?: Message): Message {
  if (originalMessage === undefined) originalMessage = contextMessage;

  const message = {
    id: generateId(), // This identifies this message
    correlationId: generateId(), // This identifies this flow
    tags: messageFactory._createTags(config, originalMessage),
    topics: {},
    meta: null, // To be filled with createMeta() -> completeMeta() sequence
    ack: null, // To be filled on ack or response
    payload: {}
  };

  return message;
}

export function createDirectedMessage(config?: MessageConfig, originalMessage?: Message): Message {
  const message = messageFactory.createBaseMessage(config, originalMessage);

  if (config.middlewareNamespace) {
    message.topics.forward = config.namespace;
    message.topics.to = config.middlewareNamespace;
  } else {
    message.topics.to = config.namespace;
  }

  if (config.routingKey) {
    message.topics.routingKey = config.routingKey;
  }

  return message;
}

export function createBroadcastMessage(config?: MessageConfig, originalMessage?: Message): Message {
  const meta = messageFactory.createMeta(config, originalMessage);
  const message = messageFactory.createDirectedMessage(config, originalMessage);

  message.meta = meta;

  return message;
}

export function createRequestMessage(config?: MessageConfig, originalMessage?: Message): Message {
  const message = messageFactory.createDirectedMessage(config, originalMessage);

  message.topics.response = config.namespace + ':response:' + INSTANCE_ID;

  return message;
}

export function createResponseMessage(config: MessageConfig, originalMessage: Message, ack: MessageAck, payload?: MessagePayload): Message {
  const message = messageFactory.createBaseMessage(config, originalMessage);

  message.correlationId = originalMessage && originalMessage.correlationId;
  message.topics.to = originalMessage.topics.response;
  message.ack = ack;
  message.payload = payload;

  return message;
}

export function createAckMessage(config: MessageConfig, originalMessage: Message, ack: MessageAck): Message {
  return messageFactory.createResponseMessage(config, originalMessage, ack, null);
}

export function createAck(config?: MessageConfig): MessageAck {
  return {
    responderId: generateId(), // config.groupId || generateId(),
    responsesRemaining: null, // -n decrements, 0 resets, n increments
    timeoutMs: null // Defaults to the timeout on the collector/requester
  };
}

export function createMeta(config?: MessageConfig, originalMessage?: Message): MessageMeta {
  if (originalMessage === undefined) originalMessage = contextMessage;

  return {
    ttl: (config && config.ttl) || null,
    createdAt: new Date(),
    publishedAt: null,
    durationMs: null,
    serviceDetails: serviceDetails
  };
}

export function completeMeta(message?: Message, meta?: MessageMeta): Message {
  meta.publishedAt = new Date();
  meta.durationMs = meta.publishedAt.valueOf() - meta.createdAt.valueOf();
  message.meta = meta;
  return message;
}

export function startContext(message?: Message): void {
  contextMessage = message;
}

export function endContext(): void {
  contextMessage = null;
}

export function _createTags(config, originalMessage) {
  return _.union(config && config.tags, originalMessage && originalMessage.tags);
}
