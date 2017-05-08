import {EventEmitter} from "events";
const last = require("lodash.last");
const isFunction = require("lodash.isfunction");
const isUndefined = require("lodash.isundefined");
import * as messageFactory from "./messageFactory";
import generateId = require("./support/generateId");

export class Responder {
  channelManager: any;
  config: any;
  ack: messageFactory.MessageAck;
  originalMessage: messageFactory.Message;
  responseChannelTimeoutMs: number;

  constructor(config: any, originalMessage?: messageFactory.Message) {
    if (!config) throw new Error("config is required");
    if (!originalMessage) throw new Error("originalMessage is required");

    this.channelManager = require("./channelManager").default;
    this.config = config;
    this.ack = {
      responderId: generateId(),
      responsesRemaining: null, // -n decrements, 0 resets, n increments
      timeoutMs: null, // Defaults to the timeout on the collector/requester
    };
    this.originalMessage = originalMessage;
    this.responseChannelTimeoutMs = ("responseChannelTimeoutMs" in config) ?
      config.responseChannelTimeoutMs : 15 * 60000; // Default: 15 minutes
  }

  static createEmitter(config: any, channelManager?: any): any {
    if (!channelManager) channelManager = require("./channelManager").default;

    const emitter: any = new EventEmitter();
    const topic = config.namespace;
    const channelOptions = ("groupId" in config) ? {groupId: config.groupId} : null;
    const channel = channelManager.findOrCreateConsumer(topic, channelOptions);

    function onMessage(message: messageFactory.Message): void {
      const responder = new Responder(config, message);
      responder.channelManager = channelManager;
      emitter.emit("responder", responder);
    }

    channel.on("message", onMessage);

    emitter.end = (): void => {
      channel.removeListener("message", onMessage);
    };

    return emitter;
  };

  //todo: overload this function
  sendAck(timeoutMs: any, responsesRemaining?: any, cb?: any): void {
    if (!cb) {
      cb = last(arguments);
      if (!isFunction(cb)) cb = null;
      if (timeoutMs === cb) timeoutMs = null;
      if (responsesRemaining === cb) responsesRemaining = undefined;
    }

    this.ack.timeoutMs = (timeoutMs > -1) ? timeoutMs : this.ack.timeoutMs;
    if (isUndefined(responsesRemaining)) {
      this.ack.responsesRemaining = 1;
    } else {
      this.ack.responsesRemaining = responsesRemaining;
    }

    const ackMessage = messageFactory.createAckMessage(this.originalMessage, this.ack, this.config);

    this._sendMessage(ackMessage, cb);
  };

  send(payload: messageFactory.MessagePayload, cb?: Function): void {
    this.ack.responsesRemaining = -1;
    const message = messageFactory.createResponseMessage(this.originalMessage, payload, this.ack, this.config);
    this._sendMessage(message, cb);
  };

  _sendMessage(message: messageFactory.Message, cb?: Function): void {
    if (!cb) {
      cb = (): void => {};
    }

    this
      .channelManager
      .findOrCreateProducer(message.topics.to, this.responseChannelTimeoutMs)
      .publish(message, cb);
  };
}
