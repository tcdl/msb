"use strict";
var chai_1 = require("chai");
var simple = require("simple-mock");
describe.only("config", function () {
    afterEach(function (done) {
        simple.restore();
        done();
    });
    describe("default", function () {
        var config;
        beforeEach(function (done) {
            config = require("../lib/config").create();
            done();
        });
        describe("configure()", function () {
            it("should merge provided options", function (done) {
                config.configure({
                    etc: "abc"
                });
                chai_1.expect(config.etc).equals("abc");
                done();
            });
        });
        describe("_init()", function () {
            it("should load JSON config file", function (done) {
                simple.mock(process.env, "MSB_CONFIG_PATH", require("path").join(__dirname, "fixtures", "sample_config.json"));
                config._init();
                chai_1.expect(config.configurationTestValue).equals(12345);
                done();
            });
            it("should load JS config file", function (done) {
                simple.mock(process.env, "MSB_CONFIG_PATH", require("path").join(__dirname, "fixtures", "sample_config.js"));
                config._init();
                chai_1.expect(Date.now() - config.configurationTestValue).lessThan(2000);
                done();
            });
        });
    });
    describe("create()", function () {
        it("should load config from environment variables", function (done) {
            simple.mock(process.env, "MSB_BROKER_ADAPTER", "a");
            simple.mock(process.env, "MSB_BROKER_HOST", "c");
            simple.mock(process.env, "MSB_BROKER_PORT", "e");
            simple.mock(process.env, "MSB_BROKER_PASS", "g");
            simple.mock(process.env, "MSB_BROKER_USER", "i");
            simple.mock(process.env, "MSB_AMQP_VHOST", "j");
            var config = require("../lib/config").create();
            chai_1.expect(config.brokerAdapter).equals("a");
            chai_1.expect(config.amqp.host).equals("c");
            chai_1.expect(config.amqp.port).equals("e");
            chai_1.expect(config.amqp.login).equals("i");
            chai_1.expect(config.amqp.password).equals("g");
            chai_1.expect(config.amqp.vhost).equals("j");
            done();
        });
    });
});
