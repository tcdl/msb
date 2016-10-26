import {EventEmitter} from "events";
import {Message} from "../../messageFactory";
import serviceDetails = require("../../support/serviceDetails");
import {AMQPConfig, AMQPConsumerOptions} from "./index";

const _ = require("lodash");

export class AMQPSubscriberAdapter extends EventEmitter {
  private config: AMQPConfig;
  private namespace: string;
  private options: AMQPConsumerOptions;
  private connection: any;
  private consumer: any;
  private ackMap: WeakMap<Message, any>;
  private queueOptions: QueueOptions;
  private isClosed: boolean;

  constructor(config: AMQPConfig, namespace: string, options: AMQPConsumerOptions, connection: any) {
    super();
    this.setMaxListeners(0);
    this.config = config;
    this.namespace = namespace;
    this.options = options;
    this.connection = connection;
    this.isClosed = false;

    this.ackMap = new WeakMap();

    this.on("error", () => this.onSelfError());
    this.init();
  }

  close() {
    this.isClosed = true;
    this.connection.removeListener("ready", () => this.ensureConsuming());
    if (this.consumer) this.consumer.close();
  }

  onceConsuming(cb) {
    if (this.consumer && this.consumer.consumerState === "open") return cb();
    this.once("consuming", cb);
  }

  confirmProcessedMessage(message: Message, _safe: boolean) {
    const envelope = this.ackMap.get(message);
    // Only use _safe if you can"t know whether message has already been confirmed/rejected
    if (_safe && !envelope) return;
    envelope.ack(); // Will fail if `!config.prefetchCount`
    this.ackMap.delete(message);
  }

  rejectMessage(message: Message) {
    const envelope = this.ackMap.get(message);
    envelope.reject(); // Will fail if `!config.prefetchCount`
    this.ackMap.delete(message);
  }

  private init() {
    this.connection.on("ready", () => this.ensureConsuming());
    if (this.connection.state === "open") this.ensureConsuming();
  }

  private onMessage(envelope: any) {
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

  private onSelfError() {
    // Do nothing
  }

  private onConsumerError(err) {
    this.emit("error", err);
  }

  private emitConsuming() {
    this.emit("consuming");
  }

  private ensureConsuming() {
    const config = this.config;
    const options = this.options;
    const connection = this.connection;
    let consumer = this.consumer;

    const exchange = connection.exchange({ exchange: this.namespace, type: options.type || config.type });

    const done = (err) => {
      if (err) return this.emit("error", err);
      this.emitConsuming();
    };

    exchange.declare((err) => {
      if (err) return done(err);

      const queueOptions = this.getQueueOptions();
      const queue = connection.queue(queueOptions);
      const bindingKeys = !options.bindingKeys ? [""] :
        _.isString(options.bindingKeys) ? [options.bindingKeys] : options.bindingKeys;

      queue.declare(queueOptions, (err) => {
        if (err) return done(err);

        for (let index = 0; index < bindingKeys.length; ++index) {
          queue.bind(this.namespace, bindingKeys[index], (err) => {
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

  private getQueueOptions() {
    if (this.queueOptions) return this.queueOptions;

    const config = this.config;
    const queueSuffix = "." + (config.groupId || serviceDetails.instanceId) + "." + ((config.durable) ? "d" : "t");
    const queueName = this.namespace + queueSuffix;

    const queueOptions: QueueOptions = {
      queue: queueName,
      exclusive: !config.groupId,
      prefetchCount: config.prefetchCount,
      passive: false
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
