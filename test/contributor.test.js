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
var Contributor = msb.Contributor;
var channelManager = msb.channelManager;

/* Tests */
describe('Contributor', function() {
  afterEach(function(done) {
    simple.restore();
    done();
  });

  describe('()', function() {

    it('cannot be initialized without a config', function(done) {

      expect(function() {
        var contributor = new Contributor(null, {});
      }).to.throw();

      done();
    });

    it('cannot be initialized without an original message', function(done) {

      expect(function() {
        var contributor = new Contributor({});
      }).to.throw();

      done();
    });

    it('can be initialized', function(done) {

      var contributor = Contributor({}, { topics: {} });

      done();
    });
  });

  describe('sendAck()', function() {
    var contributor;

    beforeEach(function(done) {
      contributor = new Contributor({}, { topics: { ack: 'ack' } });

      simple.mock(contributor, '_sendMessage').returnWith();

      done();
    });

    it('can be called without params', function(done) {
      expect(function() {
        contributor.sendAck();
      }).to.not.throw();

      expect(contributor.ack.timeoutMs).equals(null);
      expect(contributor.ack.contribsRemaining).equals(1);

      expect(contributor._sendMessage.called).true();

      var message = contributor._sendMessage.lastCall.args[0];
      expect(message.ack).deep.equals(contributor.ack);

      done();
    });

    it('can be called with only a timeout', function(done) {
      expect(function() {
        contributor.sendAck(333);
      }).to.not.throw();

      expect(contributor.ack.timeoutMs).equals(333);
      expect(contributor.ack.contribsRemaining).equals(1);

      expect(contributor._sendMessage.called).true();

      var message = contributor._sendMessage.lastCall.args[0];
      expect(message.ack).deep.equals(contributor.ack);

      done();
    });

    it('can be called with only a contribs remaining', function(done) {
      expect(function() {
        contributor.sendAck(null, 5);
      }).to.not.throw();

      expect(contributor.ack.timeoutMs).equals(null);
      expect(contributor.ack.contribsRemaining).equals(5);

      expect(contributor._sendMessage.called).true();

      var message = contributor._sendMessage.lastCall.args[0];
      expect(message.ack).deep.equals(contributor.ack);

      done();
    });

    it('can be called with only a cb', function(done) {
      var cb = simple.mock();

      expect(function() {
        contributor.sendAck(cb);
      }).to.not.throw();

      expect(contributor.ack.timeoutMs).equals(null);
      expect(contributor.ack.contribsRemaining).equals(1);

      expect(contributor._sendMessage.called).true();
      expect(contributor._sendMessage.lastCall.args[1]).equals(cb);

      var message = contributor._sendMessage.lastCall.args[0];
      expect(message.ack).deep.equals(contributor.ack);

      done();
    });

    it('can be called with timeout, contribs remaining and a cb', function(done) {
      var cb = simple.mock();

      expect(function() {
        contributor.sendAck(444, 5, cb);
      }).to.not.throw();

      expect(contributor.ack.timeoutMs).equals(444);
      expect(contributor.ack.contribsRemaining).equals(5);

      expect(contributor._sendMessage.called).true();
      expect(contributor._sendMessage.lastCall.args[1]).equals(cb);

      var message = contributor._sendMessage.lastCall.args[0];
      expect(message.ack).deep.equals(contributor.ack);

      done();
    });

    it('can be called with only a timeout and cb with existing ack', function(done) {
      var cb = simple.mock();

      expect(function() {
        contributor.sendAck(); // Setup
        contributor.ack.contribsRemaining = 10;
      }).to.not.throw();

      expect(function() {
        contributor.sendAck(333, cb);
      }).to.not.throw();

      expect(contributor.ack.timeoutMs).equals(333);
      expect(contributor.ack.contribsRemaining).equals(10);

      expect(contributor._sendMessage.called).true();

      var message = contributor._sendMessage.lastCall.args[0];
      expect(message.ack).deep.equals(contributor.ack);

      done();
    });
  });

  describe('send()', function() {
    var contributor;
    var mockChannel;

    beforeEach(function(done) {
      contributor = new Contributor({}, { topics: { ack: 'ack' } });

      mockChannel = {};
      simple.mock(mockChannel, 'publish');
      simple.mock(channelManager, 'findOrCreateProducer').returnWith(mockChannel);

      done();
    });
  });

  describe('_sendMessage()', function() {
    var contributor;
    var mockChannel;

    beforeEach(function(done) {
      contributor = new Contributor({}, { topics: { ack: 'ack' } });

      mockChannel = {};
      simple.mock(mockChannel, 'publish');
      simple.mock(channelManager, 'findOrCreateProducer').returnWith(mockChannel);

      done();
    });

    it('can be called with a cb', function(done) {
      var cb = simple.mock();

      expect(function() {
        contributor._sendMessage({
          topics: { to: 'example' }
        }, cb);
      }).to.not.throw();

      expect(channelManager.findOrCreateProducer.called).true();
      expect(channelManager.findOrCreateProducer.lastCall.args[0]).equals('example');
      expect(mockChannel.publish.called).true();
      expect(mockChannel.publish.lastCall.args[1]).equals(cb);

      var message;
      expect(function() {
        message = JSON.parse(mockChannel.publish.lastCall.args[0]);
      }).to.not.throw();
      expect(message.meta).deep.equals(JSON.parse(JSON.stringify(contributor.meta)));

      done();
    });

    it('can be called without a cb', function(done) {
      expect(function() {
        contributor._sendMessage({
          topics: { to: 'example' }
        });
      }).to.not.throw();

      expect(channelManager.findOrCreateProducer.called).true();
      expect(channelManager.findOrCreateProducer.lastCall.args[0]).equals('example');
      expect(mockChannel.publish.called).true();

      var message;
      expect(function() {
        message = JSON.parse(mockChannel.publish.lastCall.args[0]);
      }).to.not.throw();
      expect(message.meta).deep.equals(JSON.parse(JSON.stringify(contributor.meta)));

      done();
    });
  });

});
