"use strict";
var publisher_1 = require("./publisher");
var subscriber_1 = require("./subscriber");
var AMQP = require("amqp-coffee");
var _ = require("lodash");
var AMQPBrokerAdapter = (function () {
    function AMQPBrokerAdapter() {
    }
    AMQPBrokerAdapter.prototype.Publish = function (config) {
        var publisher = new publisher_1.AMQPPublisherAdapter(config, this.sharedConnection(config));
        return {
            channel: function (topic) {
                return {
                    publish: publisher.publish.bind(publisher, topic),
                    close: publisher.close.bind(publisher)
                };
            }
        };
    };
    AMQPBrokerAdapter.prototype.Subscribe = function (config) {
        return new subscriber_1.AMQPSubscriberAdapter(config, this.sharedConnection(config));
    };
    AMQPBrokerAdapter.prototype.close = function () {
        if (!this.connection)
            return;
        this.connection.close();
    };
    AMQPBrokerAdapter.prototype.sharedConnection = function (config) {
        if (this.connection)
            return this.connection;
        this.connection = new AMQP(_.clone(config));
        this.connection.setMaxListeners(0);
        return this.connection;
    };
    return AMQPBrokerAdapter;
}());
function create() {
    return new AMQPBrokerAdapter();
}
exports.create = create;
