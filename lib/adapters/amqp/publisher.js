"use strict";
var AMQPPublisherAdapter = (function () {
    function AMQPPublisherAdapter(config, connection) {
        this.config = config;
        this.connection = connection;
        this._exchangeByTopic = {};
    }
    AMQPPublisherAdapter.prototype.close = function () {
        // Do nothing
    };
    AMQPPublisherAdapter.prototype.publish = function (topic, message, cb) {
        var messageStr = JSON.stringify(message);
        var routingKey = message.topics && message.topics.routingKey ? message.topics.routingKey : "";
        this.publishMessageStr(topic, messageStr, routingKey, cb);
    };
    AMQPPublisherAdapter.prototype.publishMessageStr = function (topic, messageStr, routingKey, cb) {
        var self = this;
        this.connection.publish(topic, routingKey, messageStr, { deliveryMode: 2, confirm: true }, function (err) {
            if (err && err.error && err.error.replyCode === 404) {
                return self.ensureExchange(topic, function (err) {
                    if (err)
                        return cb(err);
                    self.publishMessageStr(topic, messageStr, routingKey, cb);
                });
            }
            if (err)
                return cb(err);
            cb();
        });
    };
    AMQPPublisherAdapter.prototype.ensureExchange = function (topic, cb) {
        var exchange = this.connection.exchange({
            exchange: topic,
            type: this.config.type
        });
        exchange.declare(cb);
    };
    return AMQPPublisherAdapter;
}());
exports.AMQPPublisherAdapter = AMQPPublisherAdapter;
