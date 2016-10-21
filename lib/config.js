"use strict";
var serviceDetails = require("./support/serviceDetails");
var path_1 = require("path");
var _ = require("lodash");
var Config = (function () {
    function Config() {
        this.schema = require("../schema");
        this.cleanupConsumers = false;
        this.autoMessageContext = true;
        this.brokerAdapter = process.env.MSB_BROKER_ADAPTER || "amqp";
        this.amqp = {
            host: process.env.MSB_BROKER_HOST || "127.0.0.1",
            port: process.env.MSB_BROKER_PORT || 5672,
            login: process.env.MSB_BROKER_USER || "guest",
            password: process.env.MSB_BROKER_PASS || "guest",
            vhost: process.env.MSB_AMQP_VHOST || "/",
            groupId: serviceDetails.name,
            durable: false,
            heartbeat: 10000,
            prefetchCount: 1,
            autoConfirm: true,
            type: "fanout"
        };
        this.local = {};
        this._init();
    }
    Config.prototype.configure = function (obj) {
        _.merge(this, obj);
    };
    /**
     * @todo Make private?
     */
    Config.prototype._init = function () {
        if (process.env.MSB_CONFIG_PATH) {
            var configPath = path_1.resolve(process.env.MSB_CONFIG_PATH);
            var jsonObj = require(configPath);
            delete (require.cache[configPath]);
            this.configure(jsonObj);
        }
    };
    return Config;
}());
exports.Config = Config;
function create() {
    return new Config();
}
exports.create = create;
