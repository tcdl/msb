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
      expect(config.serviceDetails.version).equals('5.2.0');
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

    it('should set some of config.serviceDetails by environment variables', function(done) {
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
