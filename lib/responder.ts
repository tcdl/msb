import {EventEmitter} from "events";
const _ = require("lodash");
import * as messageFactory from "./messageFactory";
import {ResponderServer} from "./responderServer";

export class Responder {
  channelManager: any;
  config: any;
  meta: messageFactory.MessageMeta;
  ack: messageFactory.MessageAck;
  originalMessage: messageFactory.Message;
  responseChannelTimeoutMs: number;

  constructor(config: any, originalMessage?: messageFactory.Message) {
    if (!config) throw new Error("config is required");
    if (!originalMessage) throw new Error("originalMessage is required");

    this.channelManager = require("./channelManager").default;
    this.config = config;
    this.meta = messageFactory.createMeta(config, originalMessage);
    this.ack = messageFactory.createAck(config);
    this.originalMessage = originalMessage;
    this.responseChannelTimeoutMs = ("responseChannelTimeoutMs" in config) ?
      config.responseChannelTimeoutMs : 15 * 60000; // Default: 15 minutes
  }

  static createEmitter(config, channelManager): any {//todo new type from EventEmitter
    if (!channelManager) channelManager = require("./channelManager").default;

    const emitter: any = new EventEmitter();
    const topic = config.namespace;
    const channelOptions = ("groupId" in config) ? {groupId: config.groupId} : null;
    const channel = channelManager.findOrCreateConsumer(topic, channelOptions);

    function onMessage(message): void {
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

  static createServer(config: Object): ResponderServer {
    return new ResponderServer(config);
  };

  sendAck(timeoutMs, responsesRemaining, cb): void {
    if (!cb) {
      cb = _.last(arguments);
      if (!_.isFunction(cb)) cb = null;
      if (timeoutMs === cb) timeoutMs = null;
      if (responsesRemaining === cb) responsesRemaining = undefined;
    }

    this.ack.timeoutMs = (timeoutMs > -1) ? timeoutMs : this.ack.timeoutMs;
    if (_.isUndefined(responsesRemaining)) {
      this.ack.responsesRemaining = 1;
    } else {
      this.ack.responsesRemaining = responsesRemaining;
    }

    const ackMessage = messageFactory.createAckMessage(this.config, this.originalMessage, this.ack);

    this._sendMessage(ackMessage, cb);
  };

  send(payload, cb): void {
    this.ack.responsesRemaining = -1;
    const message = messageFactory.createResponseMessage(this.config, this.originalMessage, this.ack, payload);
    this._sendMessage(message, cb);
  };

  _sendMessage(message, cb?: Function): void {
    messageFactory.completeMeta(message, this.meta);
    if (!cb) {
      cb = (): void => {};
    }

    this
      .channelManager
      .findOrCreateProducer(message.topics.to, this.responseChannelTimeoutMs)
      .publish(message, cb);
  };
}
