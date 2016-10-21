"use strict";
var serviceDetails = require("./support/serviceDetails");
var generateId = require("./support/generateId");
var _ = require('lodash');
var INSTANCE_ID = serviceDetails.instanceId;
var messageFactory = exports;
var contextMessage = null;
function createBaseMessage(config, originalMessage) {
    if (originalMessage === undefined)
        originalMessage = contextMessage;
    var message = {
        id: generateId(),
        correlationId: generateId(),
        tags: messageFactory._createTags(config, originalMessage),
        topics: {},
        meta: null,
        ack: null,
        payload: {}
    };
    return message;
}
exports.createBaseMessage = createBaseMessage;
function createDirectedMessage(config, originalMessage) {
    var message = messageFactory.createBaseMessage(config, originalMessage);
    if (config.middlewareNamespace) {
        message.topics.forward = config.namespace;
        message.topics.to = config.middlewareNamespace;
    }
    else {
        message.topics.to = config.namespace;
    }
    if (config.routingKey) {
        message.topics.routingKey = config.routingKey;
    }
    return message;
}
exports.createDirectedMessage = createDirectedMessage;
function createBroadcastMessage(config, originalMessage) {
    var meta = messageFactory.createMeta(config, originalMessage);
    var message = messageFactory.createDirectedMessage(config, originalMessage);
    message.meta = meta;
    return message;
}
exports.createBroadcastMessage = createBroadcastMessage;
function createRequestMessage(config, originalMessage) {
    var message = messageFactory.createDirectedMessage(config, originalMessage);
    message.topics.response = config.namespace + ':response:' + INSTANCE_ID;
    return message;
}
exports.createRequestMessage = createRequestMessage;
function createResponseMessage(config, originalMessage, ack, payload) {
    var message = messageFactory.createBaseMessage(config, originalMessage);
    message.correlationId = originalMessage && originalMessage.correlationId;
    message.topics.to = originalMessage.topics.response;
    message.ack = ack;
    message.payload = payload;
    return message;
}
exports.createResponseMessage = createResponseMessage;
function createAckMessage(config, originalMessage, ack) {
    return messageFactory.createResponseMessage(config, originalMessage, ack, null);
}
exports.createAckMessage = createAckMessage;
function createAck(config) {
    return {
        responderId: generateId(),
        responsesRemaining: null,
        timeoutMs: null // Defaults to the timeout on the collector/requester
    };
}
exports.createAck = createAck;
function createMeta(config, originalMessage) {
    if (originalMessage === undefined)
        originalMessage = contextMessage;
    return {
        ttl: (config && config.ttl) || null,
        createdAt: new Date(),
        publishedAt: null,
        durationMs: null,
        serviceDetails: serviceDetails
    };
}
exports.createMeta = createMeta;
function completeMeta(message, meta) {
    meta.publishedAt = new Date();
    meta.durationMs = meta.publishedAt.valueOf() - meta.createdAt.valueOf();
    message.meta = meta;
    return message;
}
exports.completeMeta = completeMeta;
function startContext(message) {
    contextMessage = message;
}
exports.startContext = startContext;
function endContext() {
    contextMessage = null;
}
exports.endContext = endContext;
function _createTags(config, originalMessage) {
    return _.union(config && config.tags, originalMessage && originalMessage.tags);
}
exports._createTags = _createTags;
