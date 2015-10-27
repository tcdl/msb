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
var logger = require('../lib/support/logger');
var simple = require('simple-mock');

describe('logger', function() {

  afterEach(function(done) {
    simple.restore();
    done();
  });

  describe('warn()', function() {
    it('should log error to console', function(done) {
      simple.mock(console, 'error').returnWith();

      logger.warn('abc');

      expect(console.error.calls).length(1);
      expect(console.error.lastCall.arg).equals('WARNING: abc');

      done();
    });
  });
});
