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
var Collector = msb.Collector;

/* Tests */
describe('Collector', function() {
  afterEach(function(done) {
    simple.restore();
    done();
  });

  describe('()', function() {

    it('can be initialized without a config', function(done) {
      var collector = Collector();

      expect(collector.startedAt).exists();
      expect(Date.now() - collector.startedAt.valueOf()).below(10);
      expect(collector.timeoutMs).equals(3000);
      done();
    });

    it('can be initialized with a config', function(done) {
      var config = {
        responseTimeout: 555,
        ackTimeout: 50,
        waitForResponses: 1
      };
      var collector = new Collector(config);

      expect(collector.startedAt).exists();
      expect(Date.now() - collector.startedAt.valueOf()).below(10);
      expect(collector.waitForAcksUntil - config.ackTimeout - Date.now()).below(10);
      expect(collector.timeoutMs).equals(555);
      done();
    });
  });

  describe('for an instance with default config', function() {
    var collector;

    beforeEach(function(done) {
      collector = new Collector();

      done();
    });

    describe('isAwaitingAcks', function() {
      it('will be null by default', function(done) {
        expect(collector.isAwaitingAcks()).equals(null);
        done();
      });

      it('will be true if waiting for acks', function(done) {
        collector.waitForAcksUntil = new Date(Date.now() + 1000);
        expect(collector.isAwaitingAcks()).true();
        done();
      });

      it('will be false if not waiting for acks', function(done) {
        collector.waitForAcksUntil = new Date();
        expect(collector.isAwaitingAcks()).false();
        done();
      });
    });

    describe('_getMaxTimeoutMs()', function() {

      it('can return the base timeout', function(done) {

        var result = collector._getMaxTimeoutMs();
        expect(result).equals(collector.timeoutMs);
        done();
      });

      it('can return the max of responder timeouts', function(done) {

        collector.timeoutMs = 0;
        collector._timeoutMsById = {
          a: 1000,
          b: 1500,
          c: 500,
          d: 2000
        };

        collector._responsesRemainingById = {
          b: 1,
          d: 0 // Skip this timeout
        };

        var result = collector._getMaxTimeoutMs();
        expect(result).equals(1500);
        done();
      });

      it('can return the max of base and responder timeouts', function(done) {

        collector.timeoutMs = 2000;
        collector._timeoutMsById = {
          b: 1500
        };

        var result = collector._getMaxTimeoutMs();
        expect(result).equals(2000);
        done();
      });
    });

    describe('_getResponsesRemaining()', function() {

      it('can return the base responsesRemaining', function(done) {

        var result = collector._getResponsesRemaining();

        expect(result).equals(Infinity);
        done();
      });

      it('can return the sum of all responses remaining', function(done) {

        collector._responsesRemaining = 0;
        collector._responsesRemainingById = {
          a: 4,
          b: 5,
          c: 3
        };

        var result = collector._getResponsesRemaining();
        expect(result).equals(12);
        done();
      });

      it('can return the base responses remaining as a minimum', function(done) {

        collector._responsesRemaining = 1;
        collector._responsesRemainingById = {
          a: 0
        };

        var result = collector._getResponsesRemaining();
        expect(result).equals(1);
        done();
      });
    });

    describe('_setTimeoutMsForResponderId()', function(done) {

      it('will set the timeout for an id', function(done) {

        var result = collector._setTimeoutMsForResponderId('a', 10000);

        expect(result).equals(10000);
        expect(collector._getMaxTimeoutMs()).equals(10000);
        done();
      });

      it('will return null when value was not changed', function(done) {

        collector._setTimeoutMsForResponderId('a', 10000);
        var result = collector._setTimeoutMsForResponderId('a', 10000);

        expect(result).equals(null);
        expect(collector._getMaxTimeoutMs()).equals(10000);
        done();
      });

      it('will set the timeout for another id', function(done) {

        collector._setTimeoutMsForResponderId('a', 10000);
        var result = collector._setTimeoutMsForResponderId('b', 20000);

        expect(result).equals(20000);
        expect(collector._getMaxTimeoutMs()).equals(20000);
        done();
      });
    });

    describe('_setResponsesRemainingForResponderId()', function() {
      beforeEach(function(done) {
        collector._responsesRemaining = 0;
        done();
      });

      it('will set the remaining for an id', function(done) {
        var result = collector._setResponsesRemainingForResponderId('a', 5);

        expect(result).equals(5);
        expect(collector._getResponsesRemaining()).equals(5);
        done();
      });

      it('will add to the remaining for an id', function(done) {
        collector._setResponsesRemainingForResponderId('a', 1);
        var result = collector._setResponsesRemainingForResponderId('a', 5);

        expect(result).equals(6);
        expect(collector._getResponsesRemaining()).equals(6);
        done();
      });

      it('will set to the remaining for an id to zero', function(done) {
        collector._setResponsesRemainingForResponderId('a', 1);
        var result = collector._setResponsesRemainingForResponderId('a', 0);

        expect(result).equals(0);
        expect(collector._getResponsesRemaining()).equals(0);
        done();
      });

      it('will return null when value was not changed', function(done) {

        collector._setResponsesRemainingForResponderId('a', 5);
        var result = collector._setResponsesRemainingForResponderId('a', 5);

        expect(result).equals(null);
        expect(collector._getResponsesRemaining()).equals(5);
        done();
      });

      it('will return null when subtracting from a non-existent value', function(done) {
        var result = collector._setResponsesRemainingForResponderId('a', -1);

        expect(result).equals(null);
        expect(collector._getResponsesRemaining()).equals(0);
        done();
      });

      it('will return null when subtracting from a zero value', function(done) {
        collector._setResponsesRemainingForResponderId('a', 0);
        var result = collector._setResponsesRemainingForResponderId('a', -1);

        expect(result).equals(null);
        expect(collector._getResponsesRemaining()).equals(0);
        done();
      });

      it('will subtract where the value is negative', function(done) {

        collector._setResponsesRemainingForResponderId('a', 5);
        var result = collector._setResponsesRemainingForResponderId('a', -1);

        expect(result).equals(4);
        expect(collector._getResponsesRemaining()).equals(4);
        done();
      });

      it('will subtract only down to 0', function(done) {

        collector._setResponsesRemainingForResponderId('a', 5);
        var result = collector._setResponsesRemainingForResponderId('a', -10);

        expect(result).equals(0);
        expect(collector._getResponsesRemaining()).equals(0);
        done();
      });

      it('can set the remaining for another id', function(done) {

        collector._setResponsesRemainingForResponderId('a', 5);
        var result = collector._setResponsesRemainingForResponderId('b', 7);

        expect(result).equals(7);
        expect(collector._getResponsesRemaining()).equals(12);
        done();
      });
    });

    describe('_incResponsesRemaining()', function() {
      beforeEach(function(done) {
        collector._responsesRemaining = 0;
        done();
      });

      it('can add/subtract from base responses remaining, only down to 0', function(done) {

        expect(collector._incResponsesRemaining(2)).equals(2);
        expect(collector._incResponsesRemaining(1)).equals(3);
        expect(collector._incResponsesRemaining(-2)).equals(1);
        expect(collector._incResponsesRemaining(-2)).equals(0);
        done();
      });
    });

    describe('_processAck()', function() {
      beforeEach(function(done) {
        collector._responsesRemaining = 0;

        simple.mock(collector, '_setTimeoutMsForResponderId');
        simple.mock(collector, '_enableTimeout').returnWith();
        simple.mock(collector, '_setResponsesRemainingForResponderId');
        done();
      });

      it('does nothing when ack is empty', function(done) {

        expect(function() {
          collector._processAck(null);
        }).to.not.throw();
        done();
      });

      it('will enable a timeout per responder', function(done) {

        collector._processAck({
          responderId: 'a',
          timeoutMs: 5000
        });

        expect(collector._setTimeoutMsForResponderId.called).true();
        expect(collector._setTimeoutMsForResponderId.lastCall.args[0]).equals('a');
        expect(collector._setTimeoutMsForResponderId.lastCall.args[1]).equals(5000);
        expect(collector._currentTimeoutMs).equals(5000);
        expect(collector._enableTimeout.called).true();
        done();
      });

      it('will take the max timeout', function(done) {
        collector._processAck({
          responderId: 'a',
          timeoutMs: 1500
        });

        expect(collector._setTimeoutMsForResponderId.called).true();
        expect(collector._currentTimeoutMs).equals(3000);
        expect(collector._enableTimeout.called).false();
        done();
      });

      it('will set the responses remaining per responder', function(done) {
        collector._processAck({
          responderId: 'a',
          responsesRemaining: 1
        });

        expect(collector._setResponsesRemainingForResponderId.called).true();
        expect(collector._setResponsesRemainingForResponderId.lastCall.args[0]).equals('a');
        expect(collector._setResponsesRemainingForResponderId.lastCall.args[1]).equals(1);
        expect(collector._getResponsesRemaining()).equals(1);
        done();
      });
    });

    describe('listenFor...()', function() {
      var mockChannel;

      beforeEach(function(done) {
        mockChannel = {};
        simple.mock(mockChannel, 'on').returnWith(mockChannel);
        simple.mock(msb.channelManager, 'findOrCreateConsumer').returnWith(mockChannel);
        simple.mock(collector, '_onResponseMessage').returnWith();

        done();
      });

      it('should listen with _onResponseMessage', function(done) {
        var shouldAcceptMessageFn = simple.mock();
        var originalOnResponseMessageFn = collector._onResponseMessage;

        collector.listenForResponses('etc', shouldAcceptMessageFn);

        expect(msb.channelManager.findOrCreateConsumer.called).true();
        expect(msb.channelManager.findOrCreateConsumer.lastCall.args[0]).equals('etc');

        expect(mockChannel.on.called).true();
        expect(mockChannel.on.lastCall.args[0]).equals('message');
        expect(mockChannel.on.lastCall.args[1]).to.be.a.function();

        var message = {};
        var handlerFn = mockChannel.on.lastCall.args[1];
        handlerFn(message);

        expect(originalOnResponseMessageFn.called).true();
        expect(originalOnResponseMessageFn.lastCall.args[0]).equals(shouldAcceptMessageFn);
        expect(originalOnResponseMessageFn.lastCall.args[1]).equals(message);

        done();
      });
    });

    describe('removeListeners()', function() {

      it('removes the responseChannel if it exists', function(done) {
        var mockResponseChannel = {};
        simple.mock(mockResponseChannel, 'removeListener').returnWith();
        collector.responseChannel = mockResponseChannel;

        collector.removeListeners();

        expect(mockResponseChannel.removeListener.called).true();
        expect(mockResponseChannel.removeListener.lastCall.args[0]).equals('message');
        expect(mockResponseChannel.removeListener.lastCall.args[1]).equals(collector._onResponseMessage);

        expect(function() {
          collector.removeListeners();
        }).to.not.throw();

        done();
      });
    });

    describe('_onResponseMessage', function() {
      var shouldAcceptMessageFn;
      var message;

      beforeEach(function(done) {
        shouldAcceptMessageFn = simple.mock();

        simple.mock(collector, 'emit').returnWith();
        simple.mock(collector, '_incResponsesRemaining').returnWith();
        simple.mock(collector, '_processAck').returnWith();
        simple.mock(collector, 'isAwaitingResponses');
        simple.mock(collector, 'isAwaitingAcks');
        simple.mock(collector, '_enableAckTimeout').returnWith();
        simple.mock(collector, 'end').returnWith();

        message = {
          ack: 'ack',
          payload: {}
        };

        done();
      });

      it('should accept message when passed function returns true', function(done) {

        shouldAcceptMessageFn.returnWith(true);
        collector.isAwaitingResponses.returnWith(0);

        collector._onResponseMessage(shouldAcceptMessageFn, message);

        expect(shouldAcceptMessageFn.called).true();
        expect(collector.payloadMessages).length(1);
        expect(collector.emit.called).true();
        expect(collector.emit.lastCall.args[0]).equals('response');
        expect(collector.emit.lastCall.args[1]).equals(message.payload);
        expect(collector.emit.lastCall.args[2]).equals(message);
        expect(collector._incResponsesRemaining.called).true();
        expect(collector._incResponsesRemaining.lastCall.args[0]).equals(-1);
        expect(collector._processAck.called).true();
        expect(collector._processAck.lastCall.args[0]).equals(message.ack);
        expect(collector.isAwaitingResponses.called).true();
        expect(collector.end.called).true();

        done();
      });

      it('should accept message when no function is passed', function(done) {

        collector.isAwaitingResponses.returnWith(0);

        collector._onResponseMessage(null, message);

        expect(collector.payloadMessages).length(1);
        expect(collector.emit.called).true();
        expect(collector.emit.calls[0].args[0]).equals('payload');
        expect(collector.emit.lastCall.args[0]).equals('response'); // Backward-compatibility
        expect(collector.emit.lastCall.args[1]).equals(message.payload);
        expect(collector.emit.lastCall.args[2]).equals(message);
        expect(collector._incResponsesRemaining.called).true();
        expect(collector._incResponsesRemaining.lastCall.args[0]).equals(-1);
        expect(collector._processAck.called).true();
        expect(collector._processAck.lastCall.args[0]).equals(message.ack);
        expect(collector.isAwaitingResponses.called).true();
        expect(collector.end.called).true();

        done();
      });

      it('should handle ack when no payload is passed', function(done) {
        message.payload = null;

        collector._onResponseMessage(null, message);

        expect(collector.ackMessages).length(1);
        expect(collector.emit.called).true();
        expect(collector.emit.lastCall.args[0]).equals('ack');
        expect(collector.emit.lastCall.args[1]).equals(message.ack);
        expect(collector.emit.lastCall.args[2]).equals(message);
        expect(collector._processAck.called).true();
        expect(collector._processAck.lastCall.args[0]).equals(message.ack);
        expect(collector.isAwaitingResponses.called).true();

        done();
      });

      it('should not accept message when passed function returns false', function(done) {

        shouldAcceptMessageFn.returnWith(false);

        collector._onResponseMessage(shouldAcceptMessageFn, message);

        expect(collector.payloadMessages).length(0);

        done();
      });

      it('should not end when still awaiting responses', function(done) {

        collector.isAwaitingResponses.returnWith(1);

        collector._onResponseMessage(shouldAcceptMessageFn, message);

        expect(collector.end.calls).length(0);

        done();
      });

      it('should enable ack timeout when still awaiting acks', function(done) {

        collector.isAwaitingResponses.returnWith(0);
        collector.isAwaitingAcks.returnWith(true);

        collector._onResponseMessage(null, message);

        expect(collector.payloadMessages).length(1);
        expect(collector._enableAckTimeout.called).true();
        expect(collector.end.calls).length(0);

        done();
      });
    });

    describe('_onAckTimeout', function() {

      beforeEach(function(done) {
        simple.mock(collector, 'isAwaitingResponses');
        simple.mock(collector, 'end').returnWith();
        done();
      });

      it('should not end when (again) awaiting responses', function(done) {

        collector.isAwaitingResponses.returnWith(1);

        collector._onAckTimeout();

        expect(collector.isAwaitingResponses.called).true();
        expect(collector.end.called).false();

        done();
      });

      it('should end when not awaiting responses', function(done) {

        collector.isAwaitingResponses.returnWith(0);

        collector._onAckTimeout();

        expect(collector.isAwaitingResponses.called).true();
        expect(collector.end.called).true();

        done();
      });
    });

    describe('_enableAckTimeout', function() {

      beforeEach(function(done) {
        simple.mock(Collector.prototype, '_onAckTimeout').returnWith();
        simple.mock(global, 'setTimeout').returnWith(true);

        collector.waitForAcksUntil = new Date(Date.now() + 1000);

        done();
      });

      it('should do nothing if there is already an ack timeout', function(done) {

        collector._ackTimeout = true;
        collector._enableAckTimeout();

        expect(collector._ackTimeout).true();
        expect(setTimeout.called).false();

        done();
      });

      it('should set an ack timeout', function(done) {

        collector._enableAckTimeout();

        expect(collector._ackTimeout).true();
        expect(setTimeout.called).true();

        var timeoutFn = setTimeout.lastCall.args[0];
        timeoutFn();

        expect(Collector.prototype._onAckTimeout.called).true();
        expect(Collector.prototype._onAckTimeout.lastCall.context).equals(collector);

        done();
      });
    });
  });
});
