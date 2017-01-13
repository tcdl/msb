import {EventEmitter} from "events";
import {ConfigAMQP} from "../../config";
import {Message} from "../../messageFactory";
import serviceDetails = require("../../support/serviceDetails");

const _ = require("lodash");

export class AMQPSubscriberAdapter extends EventEmitter {
  private config: ConfigAMQP;
  private connection: any;
  private consumer: any;
  private ackMap: WeakMap<Message, any>;
  private queueOptions: QueueOptions;
  private isClosed: boolean;

  constructor(config: ConfigAMQP, connection: any) {
    super();
    this.setMaxListeners(0);
    this.config = config;
    this.connection = connection;
    this.isClosed = false;

    this.ackMap = new WeakMap();

    this.on("error", () => this.onSelfError());
    this.init();
  }

  close(): void {
    this.isClosed = true;
    this.connection.removeListener("ready", () => this.ensureConsuming());
    if (this.consumer) this.consumer.close();
  }

  onceConsuming(cb: Function): void {
    if (this.consumer && this.consumer.consumerState === "open") return cb();
    this.once("consuming", cb); // TODO: rename event to onReady or ready
  }

  confirmProcessedMessage(message: Message, _safe: boolean): void {
    const envelope = this.ackMap.get(message);
    // Only use _safe if you can"t know whether message has already been confirmed/rejected
    if (_safe && !envelope) return;
    envelope.ack(); // Will fail if `!config.prefetchCount`
    this.ackMap.delete(message);
  }

  rejectMessage(message: Message): void {
    const envelope = this.ackMap.get(message);
    envelope.reject(); // Will fail if `!config.prefetchCount`
    this.ackMap.delete(message);
  }

  private init(): void {
    this.connection.on("ready", () => this.ensureConsuming());
    if (this.connection.state === "open") this.ensureConsuming();
  }

  private onMessage(envelope: any): void {
    const message = envelope.data.toString();

    process.nextTick(() => {
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message);
        if (!_.isObject(parsedMessage)) throw new Error("Invalid message format");
      } catch (e) {
        envelope.reject();
        this.emit("error", e);
        return;
      }
      if (this.config.prefetchCount) this.ackMap.set(parsedMessage, envelope);
      this.emit("message", parsedMessage);
    });
  }

  private onSelfError(): void {
    // Do nothing
  }

  private onConsumerError(err: Error): void {
    this.emit("error", err);
  }

  private emitConsuming(): void {
    this.emit("consuming");
  }

  private ensureConsuming(): void {
    const config = this.config;
    const connection = this.connection;
    let consumer = this.consumer;

    const exchange = connection.exchange({ exchange: config.channel, type: config.type });

    const done = (err): void => {
      if (err) {
        this.emit("error", err);
        return;
      }
      this.emitConsuming();
    };

    exchange.declare((err) => {
      if (err) return done(err);

      const queueOptions = this.getQueueOptions();
      const queue = connection.queue(queueOptions);
      const bindingKeys = !config.bindingKeys ? [""] :
        _.isString(config.bindingKeys) ? [config.bindingKeys] : config.bindingKeys;

      queue.declare(queueOptions, (err) => {
        if (err) return done(err);

        for (let index = 0; index < bindingKeys.length; ++index) {
          queue.bind(config.channel, bindingKeys[index], (err) => {
            if (err) return done(err);
            if (this.isClosed) return; // Skip if already closed

            if (consumer) {
              this.consumer.resume(done);
            } else {
              this.consumer = consumer = connection.consume(queueOptions.queue, _.clone(queueOptions), (envelope) => this.onMessage(envelope), done);
              consumer.on("error", (err) => this.onConsumerError(err));
            }
          });
        }
      });
    });
  }

  private getQueueOptions(): QueueOptions {
    if (this.queueOptions) return this.queueOptions;

    const config = this.config;
    const queueSuffix = "." + (config.groupId || serviceDetails.instanceId) + "." + ((config.durable) ? "d" : "t");
    const queueName = config.channel + queueSuffix;

    const queueOptions: QueueOptions = {
      queue: queueName,
      exclusive: !config.groupId,
      prefetchCount: config.prefetchCount,
      passive: false,
    };

    if (config.durable) {
      queueOptions.durable = true;
      queueOptions.autoDelete = false;
    }

    return this.queueOptions = queueOptions;
  }
}

interface QueueOptions {
  queue: string;
  exclusive: boolean;
  prefetchCount: number;
  passive: boolean;
  durable?: boolean;
  autoDelete?: boolean;
}
