/* Setup */
var expect = require('chai').expect;

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
