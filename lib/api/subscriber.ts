const channelManager = require("./../channelManager").default;

export namespace Subscriber {

  import EventEmitter = NodeJS.EventEmitter;
  export class Builder {
    private _topic: string;
    private _autoConfirm: boolean = true;
    private _durable: boolean = false;
    private _groupId: any = false;

    constructor(topic: string) {
      this._topic = topic;
    }

    get topic(): string {
      return this._topic;
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

    build(): Client {
      return new Client(this);
    }

  }

  export class Client {
    private _topic: string;
    private _autoConfirm: boolean;
    private _durable: boolean;
    private _groupId: any;

    constructor(builder: Builder) {
      this._topic = builder.topic;
      this._autoConfirm = builder.autoConfirm;
      this._durable = builder.durable;
      this._groupId = builder.groupId;
    }

    subscribe(): EventEmitter {

      let options = {
        autoConfirm: this._autoConfirm,
        durable: this._durable,
        groupId: this._groupId
      };

      return channelManager
        .findOrCreateConsumer(this._topic, options);
    }


  }

}
