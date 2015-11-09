/* Setup */
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
var _ = require('lodash');
var simple = require('simple-mock');
var path = require('path');
var serviceDetailsModulePath = path.resolve(__dirname, '../lib/support/serviceDetails.js');

describe('serviceDetails', function() {
  var serviceDetails;

  beforeEach(function(done) {
    delete(require.cache[serviceDetailsModulePath]);
    done();
  });

  it('should set serviceDetails dynamically', function(done) {
    simple.mock(require('os'), 'hostname').returnWith('abchost');
    simple.mock(require('ip'), 'address').returnWith('1.2.3.4');

    serviceDetails = require(serviceDetailsModulePath);

    expect(serviceDetails.hostname).equals('abchost');
    expect(serviceDetails.ip).equals('1.2.3.4');
    expect(serviceDetails.pid).equals(process.pid);

    expect(serviceDetails.name).equals('lab');
    expect(!!serviceDetails.version.match(/\d+\.\d+\.\d+/)).true();
    expect(serviceDetails.instanceId).length(24);

    done();
  });

  it('should safely handle a lack of mainModule', function(done) {
    simple.mock(process, 'mainModule', undefined);

    serviceDetails = require(serviceDetailsModulePath);

    expect(serviceDetails.name).equals(undefined);
    expect(serviceDetails.version).equals(undefined);
    expect(serviceDetails.instanceId).length(24);

    done();
  });

  it('should safely handle a missing package.json', function(done) {
    simple.mock(process, 'mainModule', { paths: ['/tmp/etc.js'] });

    serviceDetails = require(serviceDetailsModulePath);

    expect(serviceDetails.name).equals(undefined);
    expect(serviceDetails.version).equals(undefined);
    expect(serviceDetails.instanceId).length(24);

    done();
  });

  it('should handle a valid package.json', function(done) {
    simple.mock(process, 'mainModule', { paths: [require('path').join(__dirname, 'fixtures', 'package.json')] });

    serviceDetails = require(serviceDetailsModulePath);

    expect(serviceDetails.name).equals('example');
    expect(serviceDetails.version).equals('1.0.0');
    expect(serviceDetails.instanceId).length(24);

    done();
  });

  it('should handle a valid package.json without version and name fields', function(done) {
    var path = require('path').join(__dirname, 'fixtures', 'package.json');
    var pkg = require(path);

    simple.mock(pkg, 'name', undefined);
    simple.mock(pkg, 'version', undefined);

    simple.mock(process, 'mainModule', { paths: [path] });

    serviceDetails = require(serviceDetailsModulePath);

    expect(serviceDetails.name).equals(undefined);
    expect(serviceDetails.version).equals(undefined);
    expect(serviceDetails.instanceId).length(24);

    done();
  });

  it('should set some of serviceDetails by environment variables', function(done) {
    simple.mock(process, 'mainModule', { paths: [require('path').join(__dirname, 'fixtures', 'package.json')] });

    simple.mock(process.env, 'MSB_SERVICE_NAME', 'special-name');
    simple.mock(process.env, 'MSB_SERVICE_VERSION', '999');
    simple.mock(process.env, 'MSB_SERVICE_INSTANCE_ID', 'abc123');

    serviceDetails = require(serviceDetailsModulePath);

    expect(serviceDetails.name).equals('special-name');
    expect(serviceDetails.version).equals('999');
    expect(serviceDetails.instanceId).equals('abc123');

    done();
  });
});
