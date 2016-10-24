"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require("events");
var serviceDetails = require("../../support/serviceDetails");
var _ = require("lodash");
var AMQPSubscriberAdapter = (function (_super) {
    __extends(AMQPSubscriberAdapter, _super);
    function AMQPSubscriberAdapter(config, connection) {
        var _this = this;
        _super.call(this);
        this.setMaxListeners(0);
        this.config = config;
        this.connection = connection;
        this.isClosed = false;
        this.ackMap = new WeakMap();
        this.on("error", function () { return _this.onSelfError(); });
        this.init();
    }
    AMQPSubscriberAdapter.prototype.close = function () {
        var _this = this;
        this.isClosed = true;
        this.connection.removeListener("ready", function () { return _this.ensureConsuming(); });
        if (this.consumer)
            this.consumer.close();
    };
    AMQPSubscriberAdapter.prototype.onceConsuming = function (cb) {
        if (this.consumer && this.consumer.consumerState === "open")
            return cb();
        this.once("consuming", cb);
    };
    AMQPSubscriberAdapter.prototype.confirmProcessedMessage = function (message, _safe) {
        var envelope = this.ackMap.get(message);
        // Only use _safe if you can"t know whether message has already been confirmed/rejected
        if (_safe && !envelope)
            return;
        envelope.ack(); // Will fail if `!config.prefetchCount`
        this.ackMap.delete(message);
    };
    AMQPSubscriberAdapter.prototype.rejectMessage = function (message) {
        var envelope = this.ackMap.get(message);
        envelope.reject(); // Will fail if `!config.prefetchCount`
        this.ackMap.delete(message);
    };
    AMQPSubscriberAdapter.prototype.init = function () {
        var _this = this;
        this.connection.on("ready", function () { return _this.ensureConsuming(); });
        if (this.connection.state === "open")
            this.ensureConsuming();
    };
    AMQPSubscriberAdapter.prototype.onMessage = function (envelope) {
        var _this = this;
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
                _this.emit("error", e);
                return;
            }
            if (_this.config.prefetchCount)
                _this.ackMap.set(parsedMessage, envelope);
            _this.emit("message", parsedMessage);
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
        var _this = this;
        var config = this.config;
        var connection = this.connection;
        var consumer = this.consumer;
        var exchange = connection.exchange({ exchange: config.channel, type: config.type });
        var done = function (err) {
            if (err)
                return _this.emit("error", err);
            _this.emitConsuming();
        };
        exchange.declare(function (err) {
            if (err)
                return done(err);
            var queueOptions = _this.getQueueOptions();
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
                        if (_this.isClosed)
                            return; // Skip if already closed
                        if (consumer) {
                            _this.consumer.resume(done);
                        }
                        else {
                            _this.consumer = consumer = connection.consume(queueOptions.queue, _.clone(queueOptions), function (envelope) { return _this.onMessage(envelope); }, done);
                            consumer.on("error", function (err) { return _this.onConsumerError(err); });
                        }
                    });
                }
            });
        });
    };
    AMQPSubscriberAdapter.prototype.getQueueOptions = function () {
        if (this.queueOptions)
            return this.queueOptions;
        var config = this.config;
        var queueSuffix = "." + (config.groupId || serviceDetails.instanceId) + "." + ((config.durable) ? "d" : "t");
        var queueName = config.channel + queueSuffix;
        var queueOptions = {
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
    };
    return AMQPSubscriberAdapter;
}(events_1.EventEmitter));
exports.AMQPSubscriberAdapter = AMQPSubscriberAdapter;
