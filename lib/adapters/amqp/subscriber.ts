import {EventEmitter} from "events";
import serviceDetails = require("../../support/serviceDetails");
import {ConfigAMQP} from "../../config";
import {Message} from "../../messageFactory";

const WeakMapFill = (typeof WeakMap === "undefined") ? require("weak-map") : WeakMap;
const _ = require("lodash");

export class AMQPSubscriberAdapter extends EventEmitter {

  DURABLE_QUEUE_OPTIONS = { durable: true, autoDelete: false, passive: false };
  TRANSIENT_QUEUE_OPTIONS = { passive: false };

  config: ConfigAMQP;
  connection;
  isClosed: boolean;
  _ackMap;
  consumer;
  _queueOptions;

  constructor(config: ConfigAMQP, connection) {
    super();
    this.setMaxListeners(0);
    this.config = config;
    this.connection = connection;
    this.isClosed = false;

    this._ackMap = new WeakMapFill();

    this.on("error", this.onSelfError.bind(this));
    this.init();
  }

  close() {
    this.isClosed = true;
    this.connection.removeListener("ready", this.ensureConsuming.bind(this));
    if (this.consumer) this.consumer.close();
  }

  onceConsuming(cb) {
    if (this.consumer && this.consumer.consumerState === "open") return cb();
    this.once("consuming", cb);
  }

  confirmProcessedMessage(message: Message, _safe: boolean) {
    const envelope = this._ackMap.get(message);
    // Only use _safe if you can"t know whether message has already been confirmed/rejected
    if (_safe && !envelope) return;
    envelope.ack(); // Will fail if `!config.prefetchCount`
    this._ackMap.delete(message);
  }

  rejectMessage(message: Message) {
    const envelope = this._ackMap.get(message);
    envelope.reject(); // Will fail if `!config.prefetchCount`
    this._ackMap.delete(message);
  }

  private init() {
    this.connection.on("ready", this.ensureConsuming.bind(this));
    if (this.connection.state === "open") this.ensureConsuming();
  }

  private onMessage(envelope) {
    const self = this;
    const message = envelope.data.toString();

    process.nextTick(function() {
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message);
        if (!_.isObject(parsedMessage)) throw new Error("Invalid message format");
      } catch (e) {
        envelope.reject();
        self.emit("error", e);
        return;
      }
      if (self.config.prefetchCount) self._ackMap.set(parsedMessage, envelope);
      self.emit("message", parsedMessage);
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
    const self = this;
    const config = self.config;
    const connection = self.connection;
    let consumer = self.consumer;

    const exchange = connection.exchange({ exchange: config.channel, type: config.type });

    function done(err) {
      if (err) return self.emit("error", err);
      self.emitConsuming();
    }

    exchange.declare(function(err) {
      if (err) return done(err);

      const queueOptions = self.getQueueOptions();
      const queue = connection.queue(queueOptions);
      const bindingKeys = !config.bindingKeys ? [""] :
        _.isString(config.bindingKeys) ? [config.bindingKeys] : config.bindingKeys;

      queue.declare(queueOptions, function(err) {
        if (err) return done(err);

        for (let index = 0; index < bindingKeys.length; ++index) {
          queue.bind(config.channel, bindingKeys[index], function(err) {
            if (err) return done(err);
            if (self.isClosed) return; // Skip if already closed

            if (consumer) {
              self.consumer.resume(done);
            } else {
              self.consumer = consumer = connection.consume(queueOptions.queue, _.clone(queueOptions), self.onMessage.bind(self), done);
              consumer.on("error", self.onConsumerError.bind(self));
            }
          });
        }
      });
    });
  }

  private getQueueOptions() {
    if (this._queueOptions) return this._queueOptions;

    const config = this.config;
    const queueOptionsDefaults = (config.durable) ? this.DURABLE_QUEUE_OPTIONS : this.TRANSIENT_QUEUE_OPTIONS;
    const queueSuffix = "." + (config.groupId || serviceDetails.instanceId) + "." + ((config.durable) ? "d" : "t");
    const queueName = config.channel + queueSuffix;

    this._queueOptions = _.defaults({
      queue: queueName,
      exclusive: !config.groupId,
      prefetchCount: config.prefetchCount
    }, queueOptionsDefaults);

    return this._queueOptions;
  }
}
