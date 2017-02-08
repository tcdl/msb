import serviceDetails = require("./support/serviceDetails");
import generateId = require("./support/generateId");

const _ = require("lodash");

const INSTANCE_ID = serviceDetails.instanceId;

export function createMessage(namespace: string, payload: any, config?: MessageConfig): Message {
  const metadata: MessageMeta = {
    ttl: (config && config.ttl) || null,
    createdAt: new Date(),
    serviceDetails: serviceDetails,
  };

  return {
    id: generateId(),
    correlationId: generateId(),
    tags: (config && config.tags) || [],
    topics: (config && config.routingKey) ? {to: namespace, routingKey: config.routingKey} : {to: namespace},
    meta: metadata,
    payload: payload,
  };
}

export function createRequestMessage(namespace: string, payload: any, config?: MessageConfig): Message {
  const message = createMessage(namespace, payload, config);
  message.topics.response = namespace + ":response:" + INSTANCE_ID;

  return message;
}

export function createResponseMessage(originalMessage: Message, payload: MessagePayload, ack: MessageAck, config?: MessageConfig): Message {
  const message = createMessage(originalMessage.topics.response, payload, config);
  message.correlationId = originalMessage.correlationId;
  message.ack = ack;
  message.tags = _.union(originalMessage.tags, message.tags);

  return message;
}

export function createAckMessage(originalMessage: Message, ack: MessageAck, config?: MessageConfig): Message {
  return createResponseMessage(originalMessage, null, ack, config);
}

export interface MessageConfig {
  ttl?: number;
  tags?: string[];
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
