"use strict";
var serviceDetails = require("./support/serviceDetails");
var _ = require("lodash");
function create() {
    var config = {};
    config.schema = require("../schema");
    config.cleanupConsumers = false;
    config.autoMessageContext = true;
    config.brokerAdapter = process.env.MSB_BROKER_ADAPTER || "amqp";
    config.amqp = {
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
    config.local = {};
    /**
     * Override default configuration
     *
     * @param  {Object} obj
     */
    config.configure = function (obj) {
        _.merge(config, obj);
    };
    /**
     * Initialize the configuration, values loaded dynamically on start
     * (Private, for testing)
     */
    config._init = function () {
        /* Override defaults from file */
        if (process.env.MSB_CONFIG_PATH) {
            var configPath = require("path").resolve(process.env.MSB_CONFIG_PATH);
            var jsonObj = require(configPath);
            delete (require.cache[configPath]);
            config.configure(jsonObj);
        }
    };
    config._init();
    /* Set any values that need to be set using the final config here */
    return config;
}
exports.create = create;
;
