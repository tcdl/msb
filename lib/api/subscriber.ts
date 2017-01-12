import {BrokerConfig} from "../config";
const channelManager = require("./../channelManager").default;

export namespace Subscriber {

  import EventEmitter = NodeJS.EventEmitter;
  export class Builder {
    private _topic: string;
    private _prefetchCount: number = 1;
    private _autoConfirm: boolean = true;
    private _durable: boolean = false;
    private _groupId: any = false;

    private _bindingKeys?: string[]; // TODO: combine with exchangeType?
    private _exchangeType?: string = 'fanout'; // TODO: AMQP specific

    constructor(topic: string) {
      this._topic = topic;
    }

    get topic(): string {
      return this._topic;
    }


    get prefetchCount(): number {
      return this._prefetchCount;
    }

    withPrefetchCount(value: number): Builder {
      this._prefetchCount = value;
      return this;
    }

    get autoConfirm(): boolean {
      return this._autoConfirm;
    }

    withAutoConfirm(value: boolean): Builder {
      this._autoConfirm = value;
      return this;
    }

    get durable(): boolean {
      return this._durable;
    }

    withDurable(value: boolean): Builder {
      this._durable = value;
      return this;
    }

    get groupId(): any {
      return this._groupId;
    }

    withGroupId(value: any): Builder {
      this._groupId = value;
      return this;
    }


    get bindingKeys(): string[] {
      return this._bindingKeys;
    }

    withBindingKeys(value: string[]): Builder {
      this._bindingKeys = value;
      return this;
    }

    get exchangeType(): string {
      return this._exchangeType;
    }

    withExchangeType(value: string): Builder {
      this._exchangeType = value;
      return this;
    }

    createEmitter(): EventEmitter {
      return new Client(this).createEmitter();
    }

  }

  export class Client {
    private topic: string;
    private brokerConfig: BrokerConfig;

    constructor(builder: Builder) {
      this.topic = builder.topic;

      this.brokerConfig = {
        prefetchCount: builder.prefetchCount,
        autoConfirm: builder.autoConfirm,
        durable: builder.durable,
        groupId: builder.groupId,
        bindingKeys: builder.bindingKeys,
        type: builder.exchangeType
      };
    }

    createEmitter(): EventEmitter {
      return channelManager
        .findOrCreateConsumer(this.topic, this.brokerConfig);
    }


  }

}
