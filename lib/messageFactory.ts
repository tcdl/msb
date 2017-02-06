import serviceDetails = require("./support/serviceDetails");
import generateId = require("./support/generateId");

const _ = require("lodash");

const INSTANCE_ID = serviceDetails.instanceId;

let contextMessage: Message = null;

export function createBaseMessage(config?: MessageConfig, originalMessage?: Message): Message {
  if (originalMessage === undefined) originalMessage = contextMessage;

  const message = {
    id: generateId(), // This identifies this message
    correlationId: generateId(), // This identifies this flow
    tags: _createTags(config, originalMessage),
    topics: {},
    meta: null, // To be filled with createMeta() -> completeMeta() sequence
    ack: null, // To be filled on ack or response
    payload: {},
  };

  return message;
}

/**
 * @deprecated
 */
export function createDirectedMessage(namespace: string, config?: MessageConfig, originalMessage?: Message): Message {
  const message = createBaseMessage(config, originalMessage);

  if (config.middlewareNamespace) {
    message.topics.forward = namespace;
    message.topics.to = config.middlewareNamespace;
  } else {
    message.topics.to = namespace;
  }

  if (config.routingKey) {
    message.topics.routingKey = config.routingKey;
  }

  return message;
}

/**
 * @deprecated
 */
export function createBroadcastMessage(namespace: string, config?: MessageConfig, originalMessage?: Message): Message {
  const meta = createMeta(config, originalMessage);
  const message = createDirectedMessage(namespace, config, originalMessage);

  message.meta = meta;

  return message;
}

export function createEventMessage(namespace: string, payload: any, config?: MessageConfig): Message {
  const meta = createMeta(config, null);
  const message = createDirectedMessage(namespace, config, null);
  message.meta = meta;
  message.payload = payload;
  return completeMeta(message, message.meta);
}

export function createRequestMessage(namespace: string, payload: any, config?: MessageConfig): Message {
  const message = createEventMessage(namespace, payload, config);

  message.topics.response = namespace + ":response:" + INSTANCE_ID;

  return message;
}

export function createResponseMessage(config: MessageConfig, originalMessage: Message, ack: MessageAck, payload?: MessagePayload): Message {
  const message = createBaseMessage(config, originalMessage);

  message.correlationId = originalMessage && originalMessage.correlationId;
  message.topics.to = originalMessage.topics.response;
  message.ack = ack;
  message.payload = payload;

  return message;
}

export function createAckMessage(config: MessageConfig, originalMessage: Message, ack: MessageAck): Message {
  return createResponseMessage(config, originalMessage, ack, null);
}

export function createAck(config?: MessageConfig): MessageAck {
  return {
    responderId: generateId(), // config.groupId || generateId(),
    responsesRemaining: null, // -n decrements, 0 resets, n increments
    timeoutMs: null, // Defaults to the timeout on the collector/requester
  };
}

export function createMeta(config?: MessageConfig, originalMessage?: Message): MessageMeta {
  if (originalMessage === undefined) originalMessage = contextMessage; // TODO: obsolete?

  return {
    ttl: (config && config.ttl) || null,
    createdAt: new Date(),
    publishedAt: null,
    durationMs: null,
    serviceDetails: serviceDetails,
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

function _createTags(config: MessageConfig, originalMessage: Message): string[] {
  return _.union(config && config.tags, originalMessage && originalMessage.tags);
}

export interface MessageConfig {
  ttl?: number;
  tags?: string[];
  /**
   * @deprecated since version 2.0
   */
  middlewareNamespace?: string;
  routingKey?: string;
}

export interface Message {
  id: string;
  correlationId: string;
  tags: string[];
  topics: {
    forward?: string;
    to?: string;
    response?: string;
    routingKey?: string;
  };
  meta?: MessageMeta;
  ack?: MessageAck;
  payload?: MessagePayload;
}

export interface MessagePayload {
  [key: string]: any;
  body?: any;
}

export interface MessageMeta {
  serviceDetails: {
    hostname: string;
    ip?: string;
    pid: number;
    name: string;
    version: string;
    instanceId: string;
  };
  ttl?: number;
  publishedAt?: Date;
  createdAt: Date;
  durationMs?: number;
}

export interface MessageAck {
  responderId: string;
  responsesRemaining?: number;
  timeoutMs?: number;
}
