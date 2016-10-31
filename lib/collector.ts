import {EventEmitter} from "events";
import {Message} from "./messageFactory";
import {msb} from "../msb";
import * as logger from "./support/logger";

export class Collector extends EventEmitter {
  channelManager: msb.channelManager;
  startedAt: Date;
  isCanceled: boolean;
  waitForAcksMs?: number;
  waitForAcksUntil?: Date;
  waitForResponsesMs?: number;
  waitForResponses?: number;
  timeoutMs: number;
  ackMessages: Message[];
  payloadMessages: Message[];
  responseChannel: msb.rawConsumer;

  private timer: NodeJS.Timer;
  private ackTimer: NodeJS.Timer;
  private currentTimeoutMs: number;
  private responsesRemainingById: {
    [key: string]: number;
  };
  private timeoutMsById: {
    [key: string]: number;
  };
  private responsesRemaining: number;

  constructor(config: any = {}) {
    super();
    this.channelManager = require("./channelManager").default;

    this.startedAt = new Date();
    this.isCanceled = false;
    this.waitForAcksMs = config.waitForAcksMs;
    this.waitForAcksUntil = null;
    this.timeoutMs = config.waitForResponsesMs || 3000;
    this.currentTimeoutMs = this.timeoutMs;

    if ("waitForResponses" in config && config.waitForResponses !== -1) {
      this.waitForResponses = config.waitForResponses;
    } else {
      this.waitForResponses = Infinity;
    }

    this.timeoutMsById = {};
    this.responsesRemainingById = {};

    this.responsesRemaining = this.waitForResponses;

    this.ackMessages = [];
    this.payloadMessages = [];
    this.once("error", () => this.cancel());
  }

  isAwaitingAcks(): boolean {
    return this.waitForAcksUntil && this.waitForAcksUntil.valueOf() > Date.now();
  }

  isAwaitingResponses(): boolean {
    return Boolean(this.getResponsesRemaining());
  }

  getResponsesRemaining(): number {
    if (!Object.keys(this.responsesRemainingById).length) {
      return this.responsesRemaining;
    }

    let responsesRemaining = 0;
    for (let key in this.responsesRemainingById) {
      responsesRemaining += this.responsesRemainingById[key];
    }
    return Math.max(this.responsesRemaining, responsesRemaining);
  }

  enableTimeout(): this {
    clearTimeout(this.timer);
    const newTimeoutMs: number = this.currentTimeoutMs - (Date.now() - this.startedAt.valueOf());
    this.timer = setTimeout(() => this.end(), newTimeoutMs);
    return this;
  }

  listenForResponses(topic, shouldAcceptMessageFn): this {
    if (this.listeners("error").length < 2) {
      logger.warn("A Collector 'error' event handler should be implemented.");
    }
    this.onResponseMessage = this.onResponseMessage.bind(this, shouldAcceptMessageFn);
    this.responseChannel = this.channelManager.findOrCreateConsumer(topic);
    this.responseChannel.on("message", this.onResponseMessage);
    if (this.waitForAcksMs) this.waitForAcksUntil = new Date(this.startedAt.valueOf() + this.waitForAcksMs);
    return this;
  };

  end(): void {
    this.cancel();
    this.emit("end");
  }

  cancel(): void {
    clearTimeout(this.timer);
    clearTimeout(this.ackTimer);
    this.removeListeners();
    this.isCanceled = true;
  };

  removeListeners(): void {
    if (this.responseChannel) {
      this.responseChannel.removeListener("message", this.onResponseMessage);
    }
  }

  onResponseMessage(shouldAcceptMessageFn: Function, message: Message): void {
    if (shouldAcceptMessageFn && !shouldAcceptMessageFn(message)) {
      return;
    }

    if (message.payload) {
      this.payloadMessages.push(message);
      this.emit("payload", message.payload, message);
      this.incResponsesRemaining(-1); // Not responder-specific
    } else {
      this.ackMessages.push(message);
      this.emit("ack", message.ack, message);
    }

    if (this.isCanceled) return; // e.g. error occurs during event

    this.processAck(message.ack);

    if (this.isAwaitingResponses()) return;
    if (this.isAwaitingAcks()) return this.enableAckTimeout();

    this.end();
  };

  enableAckTimeout(): void {
    if (this.ackTimer) return;
    const newTimeoutMs: number = this.waitForAcksUntil.valueOf() - Date.now();
    this.ackTimer = setTimeout(() => {
      if (!this.isAwaitingResponses()) {
        this.end();
      }
    }, newTimeoutMs);
  };

  private processAck(ack): void {
    if (!ack) return; // `null` ack is valid

    if ("responsesRemaining" in ack) {
      this.setResponsesRemainingForResponderId(ack.responderId, ack.responsesRemaining);
    }

    if ("timeoutMs" in ack) {
      this.setTimeoutMsForResponderId(ack.responderId, ack.timeoutMs);
    }

    const newTimeoutMs = this.getMaxTimeoutMs();
    if (newTimeoutMs !== this.currentTimeoutMs) {
      this.currentTimeoutMs = newTimeoutMs;
      this.enableTimeout();
    }
  };

  private getMaxTimeoutMs(): number {
    if (!this.timeoutMsById) return this.timeoutMs;

    let responsesRemainingById = this.responsesRemainingById;
    let timeoutMs = this.timeoutMs;
    for (let key in this.timeoutMsById) {
      // Use only what we're waiting for
      if (responsesRemainingById && (key in responsesRemainingById) && !responsesRemainingById[key]) continue;
      timeoutMs = Math.max(this.timeoutMsById[key], timeoutMs);
    }
    return timeoutMs;
  }

  private setTimeoutMsForResponderId(responderId, timeoutMs): number {
    let timeoutMsById = this.timeoutMsById = this.timeoutMsById || {};
    if (timeoutMsById[responderId] === timeoutMs) return null; // Not changed
    timeoutMsById[responderId] = timeoutMs;
    return timeoutMs;
  };

  private incResponsesRemaining(inc): number {
    this.responsesRemaining = Math.max(this.responsesRemaining + inc, 0);
    return this.responsesRemaining;
  };

  private setResponsesRemainingForResponderId(responderId: string, responsesRemaining: number): number {
    const atMin = (responsesRemaining < 0 && (!this.responsesRemainingById || !this.responsesRemainingById[responderId]));
    if (atMin) return null;

    let responsesRemainingById = this.responsesRemainingById = this.responsesRemainingById || {};
    if (responsesRemaining === 0) {
      responsesRemainingById[responderId] = 0;
    } else {
      responsesRemainingById[responderId] = responsesRemainingById[responderId] || 0;
      responsesRemainingById[responderId] = Math.max(0, responsesRemainingById[responderId] + responsesRemaining);
    }
    return responsesRemainingById[responderId];
  };

}
