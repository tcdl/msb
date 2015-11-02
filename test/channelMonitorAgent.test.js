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
var msb = require('..');
var InfoCenter = require('../lib/infoCenter');
var simple = require('simple-mock');

describe('channelMonitorAgent', function() {
  afterEach(function(done) {
    simple.restore();
    done();
  });

  describe('start()', function() {
    it('should not warn when channels have already been created', function(done) {
      simple.mock(msb.channelManager, 'hasChannels').returnWith(false);
      simple.mock(InfoCenter.prototype, 'start').returnWith();
      simple.mock(msb.logger, 'warn').returnWith();

      msb.channelMonitorAgent.start();

      expect(msb.logger.warn.calls).length(0);

      done();
    });
  });
});
