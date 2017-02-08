import {BrokerConfig} from "../config";
import * as messageFactory from "../messageFactory";
import {MessageConfig} from "../messageFactory";
import {MessagePayload} from "../messageFactory";
// TODO: how to import via typescript
const channelManager = require("./../channelManager").default;

export class Builder {
  private _topic: string;
  private _ttl?: number;
  private _tags?: string[];

  private _routingKey?: string; // TODO: combine with exchangeType?
  private _exchangeType?: string = "fanout"; // TODO: AMQP specific

  constructor(topic: string) {
    this._topic = topic;
  }

  get topic(): string {
    return this._topic;
  }

  get ttl(): number {
    return this._ttl;
  }

  withTtl(value: number): Builder {
    this._ttl = value;
    return this;
  }

  get tags(): string[] {
    return this._tags;
  }

  withTags(value: string[]): Builder {
    this._tags = value;
    return this;
  }

  get routingKey(): string {
    return this._routingKey;
  }

  withRoutingKey(value: string): Builder {
    this._routingKey = value;
    return this;
  }

  get exchangeType(): string {
    return this._exchangeType;
  }

  withExchangeType(value: string): Builder {
    this._exchangeType = value;
    return this;
  }

  publish(payload: MessagePayload, cb?: Function) {
    new Publisher(this).publish(payload, cb);
  }

}

export class Publisher {
  private topic: string;
  private messageConfig?: MessageConfig;
  private brokerConfig?: BrokerConfig;

  constructor(builder: Builder) {
    this.topic = builder.topic;

    this.messageConfig = {
      routingKey: builder.routingKey,
      ttl: builder.ttl,
      tags: builder.tags,
    };

    this.brokerConfig = {
      type: builder.exchangeType,
    };
  }

  publish(payload: MessagePayload, cb?: Function) {
    const callback = cb || function () {
      }; // do nothing

    const message = messageFactory.createMessage(this.topic, payload, this.messageConfig);

    message.payload = payload;

    channelManager
      .findOrCreateProducer(this.topic, this.brokerConfig, null)
      .publish(message, function (err) {
        if (err) return callback(err);
        return callback();
      });
  }

}
