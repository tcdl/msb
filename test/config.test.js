/* Setup */
var expect = require('chai').expect;

/* Modules */
var simple = require('simple-mock');

describe('config', function() {
  afterEach(function(done) {
    simple.restore();
    done();
  });

  describe('default', function() {
    var config;

    beforeEach(function(done) {
      config = require('../lib/config').create();
      done();
    });

    describe('configure()', function() {
      it('should merge provided options', function(done) {
        config.configure({
          etc: 'abc'
        });

        expect(config.etc).equals('abc');
        done();
      });
    });

    describe('_init()', function() {
      it('should load JSON config file', function(done) {
        simple.mock(process.env, 'MSB_CONFIG_PATH', require('path').join(__dirname, 'fixtures', 'sample_config.json'));

        config._init();

        expect(config.configurationTestValue).equals(12345);

        done();
      });

      it('should load JS config file', function(done) {
        simple.mock(process.env, 'MSB_CONFIG_PATH', require('path').join(__dirname, 'fixtures', 'sample_config.js'));

        config._init();

        expect(Date.now() - config.configurationTestValue).lessThan(2000);

        done();
      });
    });
  });

  describe('create()', function() {

    it('should load config from environment variables', function(done) {

      simple.mock(process.env, 'MSB_BROKER_ADAPTER', 'a');
      simple.mock(process.env, 'MSB_BROKER_HOST', 'c');
      simple.mock(process.env, 'MSB_BROKER_PORT', 'e');
      simple.mock(process.env, 'MSB_BROKER_PASS', 'g');
      simple.mock(process.env, 'MSB_BROKER_USER', 'i');
      simple.mock(process.env, 'MSB_AMQP_VHOST', 'j');

      var config = require('../lib/config').create();

      expect(config.brokerAdapter).equals('a');
      expect(config.amqp.host).equals('c');
      expect(config.amqp.port).equals('e');
      expect(config.amqp.login).equals('i');
      expect(config.amqp.password).equals('g');
      expect(config.amqp.vhost).equals('j');
      expect(config.amqp.ssl).equals(false);
      expect(config.amqp.reconnect).equals(false);

      expect(config.activemq.host).equals('c');
      expect(config.activemq.port).equals('e');
      expect(config.activemq.ssl).equals(false);
      expect(config.activemq.connectHeaders.login).equals('i');
      expect(config.activemq.connectHeaders.password).equals('g');
      expect(config.activemq.connectHeaders.host).equals('j');

      done();
    });
  });

  describe('ssl env variable', function() {

    it('should be set to false if incorrect value was provided', function(done) {

      simple.mock(process.env, 'MSB_BROKER_USE_SSL', '1');

      var config = require('../lib/config').create();

      expect(config.amqp.ssl).equals(false);
      expect(config.activemq.ssl).equals(false);
      done();
    });

    it('should be set to true if "true" value was provided', function(done) {

      simple.mock(process.env, 'MSB_BROKER_USE_SSL', 'true');

      var config = require('../lib/config').create();

      expect(config.amqp.ssl).equals(true);
      expect(config.activemq.ssl).equals(true);
      done();
    });
  });

  describe('reconnect env variable', function() {

    it('should be set to false if incorrect value was provided', function(done) {

      simple.mock(process.env, 'MSB_BROKER_RECONNECT', '1');

      var config = require('../lib/config').create();

      expect(config.amqp.reconnect).equals(false);
      done();
    });

    it('should be set to true if "true" value was provided', function(done) {

      simple.mock(process.env, 'MSB_BROKER_RECONNECT', 'true');

      var config = require('../lib/config').create();

      expect(config.amqp.reconnect).equals(true);
      done();
    });
  });

});
