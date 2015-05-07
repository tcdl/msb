'use strict';
/* Setup */
/*jshint camelcase: false */
var Lab = require('lab');
var Code = require('code');
var lab = exports.lab = Lab.script();

var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var beforeEach = lab.beforeEach;
var after = lab.after;
var afterEach = lab.afterEach;
var expect = Code.expect;

/* Modules */
var simple = require('simple-mock');
var config = require('../lib/config');

describe('config', function() {
  afterEach(function(done) {
    simple.restore();
    done();
  });

  describe('configure()', function() {
    it('should merge provided options and set post-configuration defaults', function(done) {
      simple.mock(config, '_afterConfigure').returnWith();

      config.configure({
        etc: 'abc'
      });

      expect(config.etc).equals('abc');
      expect(config._afterConfigure.called).true();
      done();
    });
  });

  describe('_afterConfigure()', function() {
    it('can set groupId', function(done) {
      simple.mock(config, 'amqp', {});

      config._afterConfigure();

      expect(config.amqp.groupId).equals('lab');
      done();
    });
  });

  describe('_init()', function() {
    it('should set config.serviceDetails dynamically', function(done) {
      simple.mock(require('os'), 'hostname').returnWith('abchost');
      simple.mock(require('ip'), 'address').returnWith('1.2.3.4');
      simple.mock(process, 'pid', 999999);

      config._init();

      expect(config.serviceDetails.hostname).equals('abchost');
      expect(config.serviceDetails.ip).equals('1.2.3.4');
      expect(config.serviceDetails.pid).equals(999999);

      expect(config.serviceDetails.name).equals('lab');
      expect(!!config.serviceDetails.version.match(/\d\.\d\.\d/)).true();
      expect(config.serviceDetails.instanceId).length(24);

      done();
    });

    it('should safely handle a lack of mainModule', function(done) {
      simple.mock(process, 'mainModule', undefined);

      config._init();

      expect(config.serviceDetails.name).equals(undefined);
      expect(config.serviceDetails.version).equals(undefined);
      expect(config.serviceDetails.instanceId).length(24);

      done();
    });

    it('should safely handle a missing package.json', function(done) {
      simple.mock(process, 'mainModule', { paths: ['/tmp/etc.js'] });

      config._init();

      expect(config.serviceDetails.name).equals(undefined);
      expect(config.serviceDetails.version).equals(undefined);
      expect(config.serviceDetails.instanceId).length(24);

      done();
    });

    it('should handle a valid package.json', function(done) {
      simple.mock(process, 'mainModule', { paths: [require('path').join(__dirname, 'fixtures', 'package.json')] });

      config._init();

      expect(config.serviceDetails.name).equals('example');
      expect(config.serviceDetails.version).equals('1.0.0');
      expect(config.serviceDetails.instanceId).length(24);

      done();
    });

    it('should handle a valid package.json without version and name fields', function(done) {
      var path = require('path').join(__dirname, 'fixtures', 'package.json');
      var pkg = require(path);

      simple.mock(pkg, 'name', undefined);
      simple.mock(pkg, 'version', undefined);

      simple.mock(process, 'mainModule', { paths: [path] });

      config._init();

      expect(config.serviceDetails.name).equals(undefined);
      expect(config.serviceDetails.version).equals(undefined);
      expect(config.serviceDetails.instanceId).length(24);

      done();
    });

    it('should set some of config.serviceDetails by environment variables', function(done) {
      simple.mock(process, 'mainModule', { paths: [require('path').join(__dirname, 'fixtures', 'package.json')] });

      simple.mock(process.env, 'MSB_SERVICE_NAME', 'special-name');
      simple.mock(process.env, 'MSB_SERVICE_VERSION', '999');
      simple.mock(process.env, 'MSB_SERVICE_INSTANCE_ID', 'abc123');

      config._init();

      expect(config.serviceDetails.name).equals('special-name');
      expect(config.serviceDetails.version).equals('999');
      expect(config.serviceDetails.instanceId).equals('abc123');

      done();
    });

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
