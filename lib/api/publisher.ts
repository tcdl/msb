import * as messageFactory from "../messageFactory";
import {MessageConfig} from "../messageFactory";
import {MessagePayload} from "../messageFactory";
import {BrokerConfig} from "../config";
// TODO: how to import via typescript
const channelManager = require("./../channelManager").default;

export namespace Publisher {

  export class Builder {
    private _topic: string;
    private _routingKey?: string;
    private _messageConfig?: MessageConfig; // ttl, tags
    private _brokerConfig?: BrokerConfig; // groupId, durable

    constructor(topic: string) {
      this._topic = topic;
    }

    get topic(): string {
      return this._topic;
    }

    get routingKey(): string {
      return this._routingKey;
    }

    withRoutingKey(value: string): Builder {
      this._routingKey = value;
      return this;
    }

    get messageConfig(): MessageConfig {
      return this._messageConfig;
    }

    withMessageConfig(value: MessageConfig): Builder {
      this._messageConfig = value;
      return this;
    }

    get brokerConfig(): BrokerConfig {
      return this._brokerConfig;
    }

    withBrokerConfig(value: BrokerConfig): Builder {
      this._brokerConfig = value;
      return this;
    }

    build(): Client {
      return new Client(this);
    }

  }

  export class Client {
    private topic: string;
    private routingKey?: string;
    private messageConfig?: MessageConfig; // ttl, tags
    private brokerConfig?: BrokerConfig; // groupId, durable

    private message: messageFactory.Message;

    constructor(builder: Builder) {
      this.topic = builder.topic;
      this.routingKey = builder.routingKey;
      this.messageConfig = builder.messageConfig;
      this.brokerConfig = builder.brokerConfig;
    }

    // TODO: autoConfirm?
    // TODO: cb is optional
    publish(payload: MessagePayload, cb?: any) {
      // TODO: take out namespace from MessageConfig
      this.messageConfig.namespace = this.topic;
      this.message = messageFactory.createBroadcastMessage(this.messageConfig);
      // TODO: if meta is null, get it from the message
      // TODO: we need a method which creates and completes meta at once
      messageFactory.completeMeta(this.message, this.message.meta);

      this.message.payload = payload;

      channelManager
        .findOrCreateProducer(this.topic, this.brokerConfig, null)
        .publish(this.message, function (err) {
          if (err) return cb(err);
          return cb();
        });
    }

  }


}
