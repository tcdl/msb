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
        contribTimeout: 555,
        waitForContribs: 1
      };
      var collector = new Collector(config);

      expect(collector.startedAt).exists();
      expect(Date.now() - collector.startedAt.valueOf()).below(10);
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

    describe('_getMaxTimeoutMs()', function() {

      it('can return the base timeout', function(done) {

        var result = collector._getMaxTimeoutMs();
        expect(result).equals(collector.timeoutMs);
        done();
      });

      it('can return the max of contributor timeouts', function(done) {

        collector.timeoutMs = 0;
        collector._timeoutMsById = {
          a: 1000,
          b: 1500,
          c: 500,
          d: 2000
        };

        collector._contribsRemainingById = {
          b: 1,
          d: 0 // Skip this timeout
        };

        var result = collector._getMaxTimeoutMs();
        expect(result).equals(1500);
        done();
      });

      it('can return the max of base and contributor timeouts', function(done) {

        collector.timeoutMs = 2000;
        collector._timeoutMsById = {
          b: 1500
        };

        var result = collector._getMaxTimeoutMs();
        expect(result).equals(2000);
        done();
      });
    });

    describe('_getContribsRemaining()', function() {

      it('can return the base contribsRemaining', function(done) {

        var result = collector._getContribsRemaining();

        expect(result).equals(Number.MAX_VALUE);
        done();
      });

      it('can return the sum of all contribs remaining', function(done) {

        collector._contribsRemaining = 0;
        collector._contribsRemainingById = {
          a: 4,
          b: 5,
          c: 3
        };

        var result = collector._getContribsRemaining();
        expect(result).equals(12);
        done();
      });

      it('can return the base contribs remaining as a minimum', function(done) {

        collector._contribsRemaining = 1;
        collector._contribsRemainingById = {
          a: 0
        };

        var result = collector._getContribsRemaining();
        expect(result).equals(1);
        done();
      });
    });

    describe('_setTimeoutMsForContributorId()', function(done) {

      it('will set the timeout for an id', function(done) {

        var result = collector._setTimeoutMsForContributorId('a', 10000);

        expect(result).equals(10000);
        expect(collector._getMaxTimeoutMs()).equals(10000);
        done();
      });

      it('will return null when value was not changed', function(done) {

        collector._setTimeoutMsForContributorId('a', 10000);
        var result = collector._setTimeoutMsForContributorId('a', 10000);

        expect(result).equals(null);
        expect(collector._getMaxTimeoutMs()).equals(10000);
        done();
      });

      it('will set the timeout for another id', function(done) {

        collector._setTimeoutMsForContributorId('a', 10000);
        var result = collector._setTimeoutMsForContributorId('b', 20000);

        expect(result).equals(20000);
        expect(collector._getMaxTimeoutMs()).equals(20000);
        done();
      });
    });

    describe('_setContribsRemainingForContributorId()', function() {
      beforeEach(function(done) {
        collector._contribsRemaining = 0;
        done();
      });

      it('will set the remaining for an id', function(done) {

        var result = collector._setContribsRemainingForContributorId('a', 5);

        expect(result).equals(5);
        expect(collector._getContribsRemaining()).equals(5);
        done();
      });

      it('will return null when value was not changed', function(done) {

        collector._setContribsRemainingForContributorId('a', 5);
        var result = collector._setContribsRemainingForContributorId('a', 5);

        expect(result).equals(null);
        expect(collector._getContribsRemaining()).equals(5);
        done();
      });

      it('will subtract where the value is negative', function(done) {

        collector._setContribsRemainingForContributorId('a', 5);
        var result = collector._setContribsRemainingForContributorId('a', -1);

        expect(result).equals(4);
        expect(collector._getContribsRemaining()).equals(4);
        done();
      });

      it('will subtract only down to 0', function(done) {

        collector._setContribsRemainingForContributorId('a', 5);
        var result = collector._setContribsRemainingForContributorId('a', -10);

        expect(result).equals(0);
        expect(collector._getContribsRemaining()).equals(0);
        done();
      });

      it('can set the remaining for another id', function(done) {

        collector._setContribsRemainingForContributorId('a', 5);
        var result = collector._setContribsRemainingForContributorId('b', 7);

        expect(result).equals(7);
        expect(collector._getContribsRemaining()).equals(12);
        done();
      });
    });

    describe('_incContribsRemaining()', function() {
      beforeEach(function(done) {
        collector._contribsRemaining = 0;
        done();
      });

      it('can add/subtract from base contribs remaining, only down to 0', function(done) {

        expect(collector._incContribsRemaining(2)).equals(2);
        expect(collector._incContribsRemaining(1)).equals(3);
        expect(collector._incContribsRemaining(-2)).equals(1);
        expect(collector._incContribsRemaining(-2)).equals(0);
        done();
      });
    });

    describe('_processAck()', function() {
      beforeEach(function(done) {
        collector._contribsRemaining = 0;

        simple.mock(collector, '_setTimeoutMsForContributorId');
        simple.mock(collector, '_enableTimeout').returnWith();
        simple.mock(collector, '_setContribsRemainingForContributorId');
        done();
      });

      it('does nothing when ack is empty', function(done) {

        expect(function(){
          collector._processAck(null);
        }).to.not.throw();
        done();
      });

      it('will enable a timeout per contributor', function(done) {

        collector._processAck({
          contributorId: 'a',
          timeoutMs: 5000
        });

        expect(collector._setTimeoutMsForContributorId.called).true();
        expect(collector._setTimeoutMsForContributorId.lastCall.args[0]).equals('a');
        expect(collector._setTimeoutMsForContributorId.lastCall.args[1]).equals(5000);
        expect(collector._currentTimeoutMs).equals(5000);
        expect(collector._enableTimeout.called).true();
        done();
      });

      it('will take the max timeout', function(done) {
        collector._processAck({
          contributorId: 'a',
          timeoutMs: 1500
        });

        expect(collector._setTimeoutMsForContributorId.called).true();
        expect(collector._currentTimeoutMs).equals(3000);
        expect(collector._enableTimeout.called).false();
        done();
      });

      it('will set the contribs remaining per contributor', function(done) {
        collector._processAck({
          contributorId: 'a',
          contribsRemaining: 1
        });

        expect(collector._setContribsRemainingForContributorId.called).true();
        expect(collector._setContribsRemainingForContributorId.lastCall.args[0]).equals('a');
        expect(collector._setContribsRemainingForContributorId.lastCall.args[1]).equals(1);
        expect(collector._getContribsRemaining()).equals(1);
        done();
      });
    });

    describe('listenFor...()', function() {
      var mockChannel;

      beforeEach(function(done) {
        mockChannel = {};
        simple.mock(mockChannel, 'on').returnWith(mockChannel);
        simple.mock(msb.channelManager, 'findOrCreateConsumer').returnWith(mockChannel);
        simple.mock(collector, '_onContribMessage').returnWith();
        simple.mock(collector, '_onAckMessage').returnWith();

        done();
      });

      it('should listen with _onContribMessage', function(done) {
        var shouldAcceptMessageFn = simple.mock();
        var originalOnContribMessageFn = collector._onContribMessage;

        collector.listenForContribs('etc', shouldAcceptMessageFn);

        expect(msb.channelManager.findOrCreateConsumer.called).true();
        expect(msb.channelManager.findOrCreateConsumer.lastCall.args[0]).equals('etc');

        expect(mockChannel.on.called).true();
        expect(mockChannel.on.lastCall.args[0]).equals('message');
        expect(mockChannel.on.lastCall.args[1]).to.be.a.function();

        var message = {};
        var handlerFn = mockChannel.on.lastCall.args[1];
        handlerFn(message);

        expect(originalOnContribMessageFn.called).true();
        expect(originalOnContribMessageFn.lastCall.args[0]).equals(shouldAcceptMessageFn);
        expect(originalOnContribMessageFn.lastCall.args[1]).equals(message);

        done();
      });

      it('should listen with _onAckMessage', function(done) {
        var shouldAcceptMessageFn = simple.mock();
        var originalOnAckMessageFn = collector._onAckMessage;

        collector.listenForAcks('etc', shouldAcceptMessageFn);

        expect(msb.channelManager.findOrCreateConsumer.called).true();
        expect(msb.channelManager.findOrCreateConsumer.lastCall.args[0]).equals('etc');

        expect(mockChannel.on.called).true();
        expect(mockChannel.on.lastCall.args[0]).equals('message');
        expect(mockChannel.on.lastCall.args[1]).to.be.a.function();

        var message = {};
        var handlerFn = mockChannel.on.lastCall.args[1];
        handlerFn(message);

        expect(originalOnAckMessageFn.called).true();
        expect(originalOnAckMessageFn.lastCall.args[0]).equals(shouldAcceptMessageFn);
        expect(originalOnAckMessageFn.lastCall.args[1]).equals(message);

        done();
      });
    });

    describe('removeListeners()', function() {

      it('removes the contribChannel and ackChannels if they exist', function(done) {
        var mockContribChannel = {};
        simple.mock(mockContribChannel, 'removeListener').returnWith();
        collector.contribChannel = mockContribChannel;

        var mockAckChannel = {};
        simple.mock(mockAckChannel, 'removeListener').returnWith();
        collector.ackChannel = mockAckChannel;

        collector.removeListeners();

        expect(mockContribChannel.removeListener.called).true();
        expect(mockContribChannel.removeListener.lastCall.args[0]).equals('message');
        expect(mockContribChannel.removeListener.lastCall.args[1]).equals(collector._onContribMessage);

        expect(mockAckChannel.removeListener.called).true();
        expect(mockAckChannel.removeListener.lastCall.args[0]).equals('message');
        expect(mockAckChannel.removeListener.lastCall.args[1]).equals(collector._onAckMessage);

        expect(function() {
          collector.removeListeners();
        }).to.not.throw();

        done();
      });
    });

    describe('_onContribMessage', function() {
      var shouldAcceptMessageFn;

      beforeEach(function(done) {
        shouldAcceptMessageFn = simple.mock();

        simple.mock(collector, 'emit').returnWith();
        simple.mock(collector, '_incContribsRemaining').returnWith();
        simple.mock(collector, '_processAck').returnWith();
        simple.mock(collector, 'awaitingContribCount');
        simple.mock(collector, 'end').returnWith();

        done();
      });

      it('should accept message', function(done) {
        var message = {
          ack: 'ack'
        };

        shouldAcceptMessageFn.returnWith(true);
        collector.awaitingContribCount.returnWith(0);

        collector._onContribMessage(shouldAcceptMessageFn, message);

        expect(shouldAcceptMessageFn.called).true();
        expect(collector.contribMessages).length(1);
        expect(collector.emit.called).true();
        expect(collector.emit.lastCall.args[0]).equals('contrib');
        expect(collector.emit.lastCall.args[1]).equals(message);
        expect(collector._incContribsRemaining.called).true();
        expect(collector._incContribsRemaining.lastCall.args[0]).equals(-1);
        expect(collector._processAck.called).true();
        expect(collector._processAck.lastCall.args[0]).equals(message.ack);
        expect(collector.awaitingContribCount.called).true();
        expect(collector.end.called).true();

        // Alternative shouldAcceptMessageFn
        shouldAcceptMessageFn.returnWith(false);
        collector._onContribMessage(shouldAcceptMessageFn, message);
        expect(collector.contribMessages).length(1);

        // Alternative Contrib Count
        collector.awaitingContribCount.returnWith(1);
        collector._onContribMessage(shouldAcceptMessageFn, message);
        expect(collector.end.calls).length(1);

        // Empty shouldAcceptMessageFn
        collector._onContribMessage(null, message);
        expect(collector.contribMessages).length(3);

        done();
      });
    });

    describe('_onAckMessage', function() {
      var shouldAcceptMessageFn;

      beforeEach(function(done) {
        shouldAcceptMessageFn = simple.mock();

        simple.mock(collector, 'emit').returnWith();
        simple.mock(collector, '_processAck').returnWith();

        done();
      });

      it('should accept message', function(done) {
        var message = {
          ack: 'ack'
        };

        shouldAcceptMessageFn.returnWith(true);
        collector._onAckMessage(shouldAcceptMessageFn, message);

        expect(shouldAcceptMessageFn.called).true();
        expect(collector.ackMessages).length(1);
        expect(collector.emit.called).true();
        expect(collector.emit.lastCall.args[0]).equals('ack');
        expect(collector.emit.lastCall.args[1]).equals(message);
        expect(collector._processAck.called).true();
        expect(collector._processAck.lastCall.args[0]).equals(message.ack);

        // Alternative shouldAcceptMessageFn
        shouldAcceptMessageFn.returnWith(false);
        collector._onAckMessage(shouldAcceptMessageFn, message);
        expect(collector.ackMessages).length(1);

        // Empty shouldAcceptMessageFn
        collector._onAckMessage(null, message);
        expect(collector.ackMessages).length(2);

        done();
      });
    });
  });
});
