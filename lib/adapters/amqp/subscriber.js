"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require("events");
var serviceDetails = require("../../support/serviceDetails");
var _ = require("lodash");
var WeakMapFill = (typeof WeakMap === "undefined") ? require("weak-map") : WeakMap;
var AMQPSubscriberAdapter = (function (_super) {
    __extends(AMQPSubscriberAdapter, _super);
    function AMQPSubscriberAdapter(config, connection) {
        _super.call(this);
        this.DURABLE_QUEUE_OPTIONS = { durable: true, autoDelete: false, passive: false };
        this.TRANSIENT_QUEUE_OPTIONS = { passive: false };
        this.setMaxListeners(0);
        this.config = config;
        this.connection = connection;
        this.isClosed = false;
        this._ackMap = new WeakMapFill();
        this.on("error", this.onSelfError.bind(this));
        this.init();
    }
    AMQPSubscriberAdapter.prototype.close = function () {
        this.isClosed = true;
        this.connection.removeListener("ready", this.ensureConsuming.bind(this));
        if (this.consumer)
            this.consumer.close();
    };
    AMQPSubscriberAdapter.prototype.onceConsuming = function (cb) {
        if (this.consumer && this.consumer.consumerState === "open")
            return cb();
        this.once("consuming", cb);
    };
    AMQPSubscriberAdapter.prototype.confirmProcessedMessage = function (message, _safe) {
        var envelope = this._ackMap.get(message);
        // Only use _safe if you can"t know whether message has already been confirmed/rejected
        if (_safe && !envelope)
            return;
        envelope.ack(); // Will fail if `!config.prefetchCount`
        this._ackMap.delete(message);
    };
    AMQPSubscriberAdapter.prototype.rejectMessage = function (message) {
        var envelope = this._ackMap.get(message);
        envelope.reject(); // Will fail if `!config.prefetchCount`
        this._ackMap.delete(message);
    };
    AMQPSubscriberAdapter.prototype.init = function () {
        this.connection.on("ready", this.ensureConsuming.bind(this));
        if (this.connection.state === "open")
            this.ensureConsuming();
    };
    AMQPSubscriberAdapter.prototype.onMessage = function (envelope) {
        var self = this;
        var message = envelope.data.toString();
        process.nextTick(function () {
            var parsedMessage;
            try {
                parsedMessage = JSON.parse(message);
                if (!_.isObject(parsedMessage))
                    throw new Error("Invalid message format");
            }
            catch (e) {
                envelope.reject();
                self.emit("error", e);
                return;
            }
            if (self.config.prefetchCount)
                self._ackMap.set(parsedMessage, envelope);
            self.emit("message", parsedMessage);
        });
    };
    AMQPSubscriberAdapter.prototype.onSelfError = function () {
        // Do nothing
    };
    AMQPSubscriberAdapter.prototype.onConsumerError = function (err) {
        this.emit("error", err);
    };
    AMQPSubscriberAdapter.prototype.emitConsuming = function () {
        this.emit("consuming");
    };
    AMQPSubscriberAdapter.prototype.ensureConsuming = function () {
        var self = this;
        var config = self.config;
        var connection = self.connection;
        var consumer = self.consumer;
        var exchange = connection.exchange({ exchange: config.channel, type: config.type });
        function done(err) {
            if (err)
                return self.emit("error", err);
            self.emitConsuming();
        }
        exchange.declare(function (err) {
            if (err)
                return done(err);
            var queueOptions = self.getQueueOptions();
            var queue = connection.queue(queueOptions);
            var bindingKeys = !config.bindingKeys ? [""] :
                _.isString(config.bindingKeys) ? [config.bindingKeys] : config.bindingKeys;
            queue.declare(queueOptions, function (err) {
                if (err)
                    return done(err);
                for (var index = 0; index < bindingKeys.length; ++index) {
                    queue.bind(config.channel, bindingKeys[index], function (err) {
                        if (err)
                            return done(err);
                        if (self.isClosed)
                            return; // Skip if already closed
                        if (consumer) {
                            self.consumer.resume(done);
                        }
                        else {
                            self.consumer = consumer = connection.consume(queueOptions.queue, _.clone(queueOptions), self.onMessage.bind(self), done);
                            consumer.on("error", self.onConsumerError.bind(self));
                        }
                    });
                }
            });
        });
    };
    AMQPSubscriberAdapter.prototype.getQueueOptions = function () {
        if (this._queueOptions)
            return this._queueOptions;
        var config = this.config;
        var queueOptionsDefaults = (config.durable) ? this.DURABLE_QUEUE_OPTIONS : this.TRANSIENT_QUEUE_OPTIONS;
        var queueSuffix = "." + (config.groupId || serviceDetails.instanceId) + "." + ((config.durable) ? "d" : "t");
        var queueName = config.channel + queueSuffix;
        this._queueOptions = _.defaults({
            queue: queueName,
            exclusive: !config.groupId,
            prefetchCount: config.prefetchCount
        }, queueOptionsDefaults);
        return this._queueOptions;
    };
    return AMQPSubscriberAdapter;
}(events_1.EventEmitter));
exports.AMQPSubscriberAdapter = AMQPSubscriberAdapter;
exports.AMQPSubscriberAdapter = AMQPSubscriberAdapter;
