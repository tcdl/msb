"use strict";
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var serviceDetails_1 = require("../../support/serviceDetails");
var WeakMapFill = (typeof WeakMap === 'undefined') ? require('weak-map') : WeakMap;
function AMQPSubscriberAdapter(config, connection) {
    this.setMaxListeners(0);
    this.config = config;
    this.connection = connection;
    this.isClosed = false;
    this._ackMap = new WeakMapFill();
    this._onMessage = this._onMessage.bind(this);
    this._onSelfError = this._onSelfError.bind(this);
    this._onConsumerError = this._onConsumerError.bind(this);
    this._ensureConsuming = this._ensureConsuming.bind(this);
    this._emitConsuming = this._emitConsuming.bind(this);
    this.on('error', this._onSelfError);
    this._init();
}
util.inherits(AMQPSubscriberAdapter, EventEmitter);
var subscriber = AMQPSubscriberAdapter.prototype;
subscriber.DURABLE_QUEUE_OPTIONS = { durable: true, autoDelete: false, passive: false };
subscriber.TRANSIENT_QUEUE_OPTIONS = { passive: false };
subscriber.close = function () {
    this.isClosed = true;
    this.connection.removeListener('ready', this._ensureConsuming);
    if (this.consumer)
        this.consumer.close();
};
subscriber.onceConsuming = function (cb) {
    if (this.consumer && this.consumer.consumerState === 'open')
        return cb();
    this.once('consuming', cb);
};
subscriber.confirmProcessedMessage = function (message, _safe) {
    var envelope = this._ackMap.get(message);
    // Only use _safe if you can't know whether message has already been confirmed/rejected
    if (_safe && !envelope)
        return;
    envelope.ack(); // Will fail if `!config.prefetchCount`
    this._ackMap.delete(message);
};
subscriber.rejectMessage = function (message) {
    var envelope = this._ackMap.get(message);
    envelope.reject(); // Will fail if `!config.prefetchCount`
    this._ackMap.delete(message);
};
subscriber._init = function () {
    this.connection.on('ready', this._ensureConsuming);
    if (this.connection.state === 'open')
        this._ensureConsuming();
};
subscriber._onMessage = function (envelope) {
    var self = this;
    var message = envelope.data.toString();
    process.nextTick(function () {
        var parsedMessage;
        try {
            parsedMessage = JSON.parse(message);
            if (!_.isObject(parsedMessage))
                throw new Error('Invalid message format');
        }
        catch (e) {
            envelope.reject();
            self.emit('error', e);
            return;
        }
        if (self.config.prefetchCount)
            self._ackMap.set(parsedMessage, envelope);
        self.emit('message', parsedMessage);
    });
};
subscriber._onSelfError = function () {
    // Do nothing
};
subscriber._onConsumerError = function (err) {
    this.emit('error', err);
};
subscriber._emitConsuming = function () {
    this.emit('consuming');
};
subscriber._ensureConsuming = function () {
    var self = this;
    var config = self.config;
    var connection = self.connection;
    var consumer = self.consumer;
    var exchange = connection.exchange({ exchange: config.channel, type: config.type });
    function done(err) {
        if (err)
            return self.emit('error', err);
        self._emitConsuming();
    }
    exchange.declare(function (err) {
        if (err)
            return done(err);
        var queueOptions = self._getQueueOptions();
        var queue = connection.queue(queueOptions);
        var bindingKeys = !config.bindingKeys ? [''] :
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
                        self.consumer = consumer = connection.consume(queueOptions.queue, _.clone(queueOptions), self._onMessage, done);
                        consumer.on('error', self._onConsumerError);
                    }
                });
            }
        });
    });
};
subscriber._getQueueOptions = function () {
    if (this._queueOptions)
        return this._queueOptions;
    var config = this.config;
    var queueOptionsDefaults = (config.durable) ? this.DURABLE_QUEUE_OPTIONS : this.TRANSIENT_QUEUE_OPTIONS;
    var queueSuffix = '.' + (config.groupId || serviceDetails_1.serviceDetails.instanceId) + '.' + ((config.durable) ? 'd' : 't');
    var queueName = config.channel + queueSuffix;
    this._queueOptions = _.defaults({
        queue: queueName,
        exclusive: !config.groupId,
        prefetchCount: config.prefetchCount
    }, queueOptionsDefaults);
    return this._queueOptions;
};
exports.AMQPSubscriberAdapter = AMQPSubscriberAdapter;
