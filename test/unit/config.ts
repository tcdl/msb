import {expect} from "chai";
import {join} from "path";
const simple = require("simple-mock");
import {create} from "../../lib/config";

describe("config", function () {
  afterEach(function (done) {
    simple.restore();
    done();
  });

  describe("default", function () {
    let config;

    beforeEach(function (done) {
      config = create();
      done();
    });

    describe("configure()", function () {
      it("should merge provided options", function (done) {
        config.configure({
          etc: "abc"
        });

        expect(config.etc).equals("abc");
        done();
      });
    });

    describe("_init()", function () {
      it("should load JSON config file", function (done) {
        simple.mock(process.env, "MSB_CONFIG_PATH", join(__dirname, "_fixtures", "sample_config.json"));

        config._init();

        expect(config.configurationTestValue).equals(12345);

        done();
      });

      it("should load JS config file", function (done) {
        simple.mock(process.env, "MSB_CONFIG_PATH", join(__dirname, "_fixtures", "sample_config.js"));

        config._init();

        expect(config.configurationTestValue).to.be.a("number");
        expect(Date.now() - config.configurationTestValue).lessThan(this.test.timer._idleStart);

        done();
      });
    });
  });

  describe("create()", function () {

    it("should load config from environment variables", function (done) {

      simple.mock(process.env, "MSB_BROKER_ADAPTER", "a");
      simple.mock(process.env, "MSB_BROKER_HOST", "c");
      simple.mock(process.env, "MSB_BROKER_PORT", "e");
      simple.mock(process.env, "MSB_BROKER_PASSWORD", "g");
      simple.mock(process.env, "MSB_BROKER_USER_NAME", "i");
      simple.mock(process.env, "MSB_BROKER_VIRTUAL_HOST", "j");

      const config = create();

      expect(config.brokerAdapter).equals("a");
      expect(config.amqp.host).equals("c");
      expect(config.amqp.port).equals("e");
      expect(config.amqp.login).equals("i");
      expect(config.amqp.password).equals("g");
      expect(config.amqp.vhost).equals("j");
      done();
    });

    it("should set ssl to false on missed MSB_BROKER_USE_SSL", function (done) {
      const config = create();
      expect(config.amqp.ssl).equals(false);
      done();
    });

    let tests = [
      {env: "0", exprected: false},
      {env: "false", exprected: false},
      {env: "1", exprected: true},
      {env: "true", exprected: true},
      {env: "any falue", exprected: false},
    ];

    tests.forEach(function (test) {
      it(`should set ssl to ${test.exprected} on MSB_BROKER_USE_SSL="${test.env}"`, function (done) {
        simple.mock(process.env, "MSB_BROKER_USE_SSL", test.env);

        const config = create();

        expect(config.amqp.ssl).equals(test.exprected);
        done();
      });
    });
  });

});
