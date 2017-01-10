import * as messageFactory from "../messageFactory";
import {MessageConfig} from "../messageFactory";
import {MessagePayload} from "../messageFactory";
import {BrokerConfig} from "../config";
// TODO: how to import via typescript
const channelManager = require("./../channelManager").default;

export namespace Publisher {

  export class Builder {
    private _topic: string;
    private _ttl?: number;
    private _tags?: string[];

    private _routingKey?: string; // TODO: combine with exchangeType?
    private _exchangeType?: string = 'fanout'; // TODO: AMQP specific

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

    publish(payload: MessagePayload, cb?: any) {
      new Client(this).publish(payload, cb);
    }

  }

  export class Client {
    private topic: string;
    private messageConfig?: MessageConfig;
    private brokerConfig?: BrokerConfig;

    constructor(builder: Builder) {
      this.topic = builder.topic;

      this.messageConfig = {
        namespace: builder.topic,
        routingKey: builder.routingKey,
        ttl: builder.ttl,
        tags: builder.tags
      };

      this.brokerConfig = {
        type: builder.exchangeType
      }
    }

    // TODO: cb is optional
    publish(payload: MessagePayload, cb?: any) {

      // TODO: take out namespace from MessageConfig and pass it explicitly
      this.messageConfig.namespace = this.topic;
      let message = messageFactory.createBroadcastMessage(this.messageConfig);
      // TODO: if meta is null, get it from the message
      // TODO: we need a method which creates and completes meta at once
      messageFactory.completeMeta(message, message.meta);

      message.payload = payload;

      channelManager
        .findOrCreateProducer(this.topic, this.brokerConfig, null)
        .publish(message, function (err) {
          if (err) return cb(err);
          return cb();
        });
    }

  }


}
