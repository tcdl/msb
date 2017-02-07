import serviceDetails = require("./support/serviceDetails");
import generateId = require("./support/generateId");

const _ = require("lodash");

const INSTANCE_ID = serviceDetails.instanceId;

let contextMessage: Message = null;

export function createMessage(namespace: string, payload: any, config?: MessageConfig, originalMessage?: Message): Message {
  if (originalMessage === undefined) originalMessage = contextMessage;

  const createdAt = new Date();
  const metadata: MessageMeta = {
    ttl: (config && config.ttl) || null,
    createdAt: createdAt,
    publishedAt: createdAt,
    durationMs: 0,
    serviceDetails: serviceDetails,
  };

  return {
    id: generateId(),
    correlationId: generateId(),
    tags: _.union(config && config.tags, originalMessage && originalMessage.tags),
    topics: config.routingKey ? {to: namespace, routingKey: config.routingKey} : {to: namespace},
    meta: metadata,
    payload: payload
  };
}

export function createRequestMessage(namespace: string, payload: any, config?: MessageConfig, originalMessage?: Message): Message {
  const message = createMessage(namespace, payload, config, originalMessage);
  message.topics.response = namespace + ":response:" + INSTANCE_ID;

  return message;
}

export function createResponseMessage(originalMessage: Message, payload: MessagePayload, ack: MessageAck, config?: MessageConfig): Message {
  const message = createMessage(originalMessage.topics.response, payload, config, originalMessage);
  message.correlationId = originalMessage.correlationId;
  message.ack = ack;

  return message;
}

export function createAckMessage(originalMessage: Message, ack: MessageAck, config?: MessageConfig): Message {
  return createResponseMessage(originalMessage, null, ack, config);
}

export function updateMetaPublishedDate(message: Message): Message {
  const meta = message.meta;
  meta.publishedAt = new Date();
  meta.durationMs = meta.publishedAt.valueOf() - meta.createdAt.valueOf();
  return message;
}

export function startContext(message?: Message): void {
  contextMessage = message;
}

export function endContext(): void {
  contextMessage = null;
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
