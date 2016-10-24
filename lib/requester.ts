import * as messageFactory from "./messageFactory";
import {Collector} from "./collector";

export class Requester extends Collector {
  meta: messageFactory.MessageMeta;
  message: messageFactory.Message;
  originalMessage: messageFactory.Message;
  requestChannelTimeoutMs: number;

  constructor(config: any, originalMessage?: messageFactory.Message) {
    super(config);
    this.meta = messageFactory.createMeta(config, originalMessage);
    this.message = messageFactory.createRequestMessage(config, originalMessage);
    this.originalMessage = originalMessage;
    this.requestChannelTimeoutMs = ("requestChannelTimeoutMs" in config) ?
      config.requestChannelTimeoutMs : 15 * 60000;
  }

  publish(payload: messageFactory.MessagePayload): Requester {
    if (payload) {
      this.message.payload = payload;
    }

    if (this.waitForAcksMs || this.waitForResponses) {
      this.shouldAcceptMessageFn = this.shouldAcceptMessageFn.bind(this);
      this.listenForResponses(this.message.topics.response, this.shouldAcceptMessageFn);
    }

    messageFactory.completeMeta(this.message, this.meta);

    if (!this.responseChannel) return this.publishMessage();
    (this.responseChannel as any).onceConsuming(this.publishMessage);
    return this;
  }

  private publishMessage(): Requester {
    this
      .channelManager
      .findOrCreateProducer(this.message.topics.to, {}, this.requestChannelTimeoutMs)
      .publish(this.message, (err?: Error) => {
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

  shouldAcceptMessageFn(message: messageFactory.Message) {
    return message.correlationId === this.message.correlationId;
  }
}
