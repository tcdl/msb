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
var msb = require('..');

/* Tests */
describe('request()', function() {
  beforeEach(function(done) {
    simple.mock(msb.Requester.prototype, 'publish');
    done();
  });

  afterEach(function(done) {
    simple.restore();
    done();
  });

  describe('with only a topic', function() {

    it('calls back on end with a response', function(done) {
      var returnValue = 'rv';

      msb.Requester.prototype.publish.callFn(function() {
        return this;
      });

      var requester = msb.request('my:topic', {
        my: 'payload'
      }, function(err, responsePayload, responseMessage) {
        if (err) return done(err);

        expect(responsePayload).equals('payload');
        expect(responseMessage).equals('message');
        done();
      });

      expect(requester instanceof msb.Requester).true();
      expect(requester.timeoutMs).equals(3000);
      expect(requester.waitForResponses).equals(1);

      requester.emit('response', 'payload', 'message');
      requester.end();
    });

    it('calls back on error', function(done) {
      var returnValue = 'rv';

      msb.Requester.prototype.publish.callFn(function() {
        return this;
      });

      var requester = msb.request('my:topic', {
        my: 'payload'
      }, function(err, responsePayload, responseMessage) {

        expect(err instanceof Error).true();
        done();
      });

      expect(requester instanceof msb.Requester).true();
      expect(requester.timeoutMs).equals(3000);
      expect(requester.waitForResponses).equals(1);

      requester.emit('error', new Error());
    });
  });

  describe('with config', function() {
    var config;

    beforeEach(function(done) {
      config = {
        namespace: 'my:topic',
        responseSchema: { type: 'object' },
        waitForResponses: 5,
        waitForResponsesMs: 5000
      };
      done();
    });

    it('calls back on end with a response', function(done) {
      var returnValue = 'rv';

      msb.Requester.prototype.publish.callFn(function() {
        return this;
      });

      var mockPayload = {};

      var requester = msb.request(config, {
        my: 'payload'
      }, function(err, responsePayload, responseMessage) {
        if (err) return done(err);

        expect(responsePayload).equals(mockPayload);
        expect(responseMessage).equals('message');
        done();
      });

      expect(requester instanceof msb.Requester).true();
      expect(requester.timeoutMs).equals(5000);
      expect(requester.waitForResponses).equals(5);

      requester.emit('response', mockPayload, 'message');
      requester.end();
    });

    it('calls back on validation error', function(done) {
      msb.Requester.prototype.publish.callFn(function() {
        return this;
      });

      var cb = simple.mock();

      var requester = msb.request(config , {
        my: 'payload'
      }, cb);

      expect(requester instanceof msb.Requester).true();
      expect(requester.timeoutMs).equals(5000);
      expect(requester.waitForResponses).equals(5);

      requester.emit('response', 'willfail', 'message');

      setTimeout(function() {

        expect(cb.callCount).equals(1);
        expect(cb.lastCall.arg instanceof Error).true();

        done();
      }, 300);
    });

    it('calls back only once on validation error after timeout', function(done) {
      config.waitForResponsesMs = 100;

      msb.Requester.prototype.publish.callFn(function() {
        this.enableTimeout();
        return this;
      });

      var cb = simple.mock();

      var requester = msb.request(config , {
        my: 'payload'
      }, cb);

      expect(requester instanceof msb.Requester).true();
      expect(requester.timeoutMs).equals(100);
      expect(requester.waitForResponses).equals(5);

      setTimeout(function() {
        requester.emit('response', 'willfail', 'message');
      }, 200);

      setTimeout(function() {
        expect(cb.callCount).equals(1);
        expect(cb.lastCall.arg instanceof Error).false();

        done();
      }, 300);
    });
  });
});
