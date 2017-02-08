import {Collector} from "./collector";
import * as messageFactory from "./messageFactory";

export class Requester extends Collector {
  config: any;
  originalMessage: messageFactory.Message;
  requestChannelTimeoutMs: number;

  constructor(config: any, originalMessage?: messageFactory.Message) {
    super(config);
    this.config = config;
    this.originalMessage = originalMessage;
    this.requestChannelTimeoutMs = ("requestChannelTimeoutMs" in config) ?
      config.requestChannelTimeoutMs : 15 * 60000;
  }

  publish(payload: messageFactory.MessagePayload): this {
    const message = messageFactory.createRequestMessage(this.config.namespace, payload, this.config);

    if (this.waitForAcksMs || this.waitForResponses) {
      this.listenForResponses(message.topics.response, (responseMessage) => responseMessage.correlationId === message.correlationId);
    }

    if (!this.responseChannel) {
      return this.publishMessage(message);
    }

    (this.responseChannel as any).onceConsuming(this.publishMessage.bind(this, message));
    return this;
  }

  publishMessage(message: messageFactory.Message): this {
    this
      .channelManager
      .findOrCreateProducer(message.topics.to, {}, this.requestChannelTimeoutMs)
      .publish(message, (err?: Error) => {
        if (err) {
          return this.emit("error", err);
        }
        if (!this.isAwaitingAcks() && !this.isAwaitingResponses()) {
          return this.end();
        }

        this.enableTimeout();
      });

    return this;
  }
}
