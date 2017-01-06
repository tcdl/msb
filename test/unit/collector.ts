import {expect} from "chai";
import {Collector} from "../../lib/collector";
import * as logger from "../../lib/support/logger";
const channelManager = require("../../lib/channelManager").default;
const simple = require("simple-mock");

describe("Collector", function () {
  afterEach(function (done) {
    simple.restore();
    done();
  });

  describe("()", function () {

    it("can be initialized without a config", function (done) {
      const collector = new Collector();

      expect(collector.startedAt).to.exist;
      expect(Date.now() - collector.startedAt.valueOf()).below(10);
      expect(collector.timeoutMs).equals(3000);
      done();
    });

    it("can be initialized with a config", function (done) {
      const config = {
        waitForResponsesMs: 555,
        waitForAcksMs: 50,
        waitForResponses: 1,
      };
      const collector = new Collector(config);

      expect(collector.startedAt).to.exist;
      expect(Date.now() - collector.startedAt.valueOf()).below(10);
      expect(collector.waitForAcksUntil).equals(null);
      expect(collector.waitForAcksMs).equals(config.waitForAcksMs);
      expect(collector.timeoutMs).equals(555);
      done();
    });
  });

  describe("for an instance with default config", function () {
    let collector;

    beforeEach(function (done) {
      collector = new Collector();

      done();
    });

    describe("isAwaitingAcks", function () {
      it("will be null by default", function (done) {
        expect(collector.isAwaitingAcks()).equals(null);
        done();
      });

      it("will be true if waiting for acks", function (done) {
        collector.waitForAcksUntil = new Date(Date.now() + 1000);
        expect(collector.isAwaitingAcks()).to.be.true;
        done();
      });

      it("will be false if not waiting for acks", function (done) {
        collector.waitForAcksUntil = new Date();
        expect(collector.isAwaitingAcks()).to.be.false;
        done();
      });
    });

    describe("getMaxTimeoutMs()", function () {

      it("can return the base timeout", function (done) {

        const result = collector.getMaxTimeoutMs();
        expect(result).equals(collector.timeoutMs);
        done();
      });

      it("can return the max of responder timeouts", function (done) {

        collector.timeoutMs = 0;
        collector.timeoutMsById = {
          a: 1000,
          b: 1500,
          c: 500,
          d: 2000,
        };

        collector.responsesRemainingById = {
          b: 1,
          d: 0, // Skip this timeout
        };

        const result = collector.getMaxTimeoutMs();
        expect(result).equals(1500);
        done();
      });

      it("can return the max of base and responder timeouts", function (done) {

        collector.timeoutMs = 2000;
        collector.timeoutMsById = {
          b: 1500,
        };

        const result = collector.getMaxTimeoutMs();
        expect(result).equals(2000);
        done();
      });
    });

    describe("getResponsesRemaining()", function () {

      it("can return the base responsesRemaining", function (done) {

        const result = collector.getResponsesRemaining();

        expect(result).equals(Infinity);
        done();
      });

      it("can return the sum of all responses remaining", function (done) {

        collector.responsesRemaining = 0;
        collector.responsesRemainingById = {
          a: 4,
          b: 5,
          c: 3,
        };

        const result = collector.getResponsesRemaining();
        expect(result).equals(12);
        done();
      });

      it("can return the base responses remaining as a minimum", function (done) {

        collector.responsesRemaining = 1;
        collector.responsesRemainingById = {
          a: 0,
        };

        const result = collector.getResponsesRemaining();
        expect(result).equals(1);
        done();
      });
    });

    describe("setTimeoutMsForResponderId()", function () {

      it("will set the timeout for an id", function (done) {

        const result = collector.setTimeoutMsForResponderId("a", 10000);

        expect(result).equals(10000);
        expect(collector.getMaxTimeoutMs()).equals(10000);
        done();
      });

      it("will return null when value was not changed", function (done) {

        collector.setTimeoutMsForResponderId("a", 10000);
        const result = collector.setTimeoutMsForResponderId("a", 10000);

        expect(result).equals(null);
        expect(collector.getMaxTimeoutMs()).equals(10000);
        done();
      });

      it("will set the timeout for another id", function (done) {

        collector.setTimeoutMsForResponderId("a", 10000);
        const result = collector.setTimeoutMsForResponderId("b", 20000);

        expect(result).equals(20000);
        expect(collector.getMaxTimeoutMs()).equals(20000);
        done();
      });
    });

    describe("setResponsesRemainingForResponderId()", function () {
      beforeEach(function (done) {
        collector.responsesRemaining = 0;
        done();
      });

      it("will set the remaining for an id", function (done) {
        const result = collector.setResponsesRemainingForResponderId("a", 5);

        expect(result).equals(5);
        expect(collector.getResponsesRemaining()).equals(5);
        done();
      });

      it("will add to the remaining for an id, same as before", function (done) {
        collector.setResponsesRemainingForResponderId("a", 1);
        const result = collector.setResponsesRemainingForResponderId("a", 1);

        expect(result).equals(2);
        expect(collector.getResponsesRemaining()).equals(2);
        done();
      });

      it("will add to the remaining for an id", function (done) {
        collector.setResponsesRemainingForResponderId("a", 1);
        const result = collector.setResponsesRemainingForResponderId("a", 5);

        expect(result).equals(6);
        expect(collector.getResponsesRemaining()).equals(6);
        done();
      });

      it("will set to the remaining for an id to zero", function (done) {
        collector.setResponsesRemainingForResponderId("a", 1);
        const result = collector.setResponsesRemainingForResponderId("a", 0);

        expect(result).equals(0);
        expect(collector.getResponsesRemaining()).equals(0);
        done();
      });

      it("will return null when subtracting from a non-existent value", function (done) {
        const result = collector.setResponsesRemainingForResponderId("a", -1);

        expect(result).equals(null);
        expect(collector.getResponsesRemaining()).equals(0);
        done();
      });

      it("will return null when subtracting from a zero value", function (done) {
        collector.setResponsesRemainingForResponderId("a", 0);
        const result = collector.setResponsesRemainingForResponderId("a", -1);

        expect(result).equals(null);
        expect(collector.getResponsesRemaining()).equals(0);
        done();
      });

      it("will subtract where the value is negative", function (done) {

        collector.setResponsesRemainingForResponderId("a", 5);
        const result = collector.setResponsesRemainingForResponderId("a", -1);

        expect(result).equals(4);
        expect(collector.getResponsesRemaining()).equals(4);
        done();
      });

      it("will subtract only down to 0", function (done) {

        collector.setResponsesRemainingForResponderId("a", 5);
        const result = collector.setResponsesRemainingForResponderId("a", -10);

        expect(result).equals(0);
        expect(collector.getResponsesRemaining()).equals(0);
        done();
      });

      it("can set the remaining for another id", function (done) {

        collector.setResponsesRemainingForResponderId("a", 5);
        const result = collector.setResponsesRemainingForResponderId("b", 7);

        expect(result).equals(7);
        expect(collector.getResponsesRemaining()).equals(12);
        done();
      });
    });

    describe("incResponsesRemaining()", function () {
      beforeEach(function (done) {
        collector.responsesRemaining = 0;
        done();
      });

      it("can add/subtract from base responses remaining, only down to 0", function (done) {

        expect(collector.incResponsesRemaining(2)).equals(2);
        expect(collector.incResponsesRemaining(1)).equals(3);
        expect(collector.incResponsesRemaining(-2)).equals(1);
        expect(collector.incResponsesRemaining(-2)).equals(0);
        done();
      });
    });

    describe("processAck()", function () {
      beforeEach(function (done) {
        collector.responsesRemaining = 0;

        simple.mock(collector, "setTimeoutMsForResponderId");
        simple.mock(collector, "enableTimeout").returnWith();
        simple.mock(collector, "setResponsesRemainingForResponderId");
        done();
      });

      it("does nothing when ack is empty", function (done) {

        expect(function () {
          collector.processAck(null);
        }).to.not.throw();
        done();
      });

      it("will enable a timeout per responder", function (done) {

        collector.processAck({
          responderId: "a",
          timeoutMs: 5000,
        });

        expect(collector.setTimeoutMsForResponderId.called).to.be.true;
        expect(collector.setTimeoutMsForResponderId.lastCall.args[0]).equals("a");
        expect(collector.setTimeoutMsForResponderId.lastCall.args[1]).equals(5000);
        expect(collector.currentTimeoutMs).equals(5000);
        expect(collector.enableTimeout.called).to.be.true;
        done();
      });

      it("will take the max timeout", function (done) {
        collector.processAck({
          responderId: "a",
          timeoutMs: 1500,
        });

        expect(collector.setTimeoutMsForResponderId.called).to.be.true;
        expect(collector.currentTimeoutMs).equals(3000);
        expect(collector.enableTimeout.called).to.be.false;
        done();
      });

      it("will set the responses remaining per responder", function (done) {
        collector.processAck({
          responderId: "a",
          responsesRemaining: 1,
        });

        expect(collector.setResponsesRemainingForResponderId.called).to.be.true;
        expect(collector.setResponsesRemainingForResponderId.lastCall.args[0]).equals("a");
        expect(collector.setResponsesRemainingForResponderId.lastCall.args[1]).equals(1);
        expect(collector.getResponsesRemaining()).equals(1);
        done();
      });
    });

    describe("listenFor...()", function () {
      let mockChannel: any;

      beforeEach(function (done) {
        mockChannel = {};
        simple.mock(logger, "warn").returnWith();
        simple.mock(mockChannel, "on").returnWith(mockChannel);
        simple.mock(channelManager, "findOrCreateConsumer").returnWith(mockChannel);
        simple.mock(collector, "onResponseMessage").returnWith();

        done();
      });

      it("should warn if there is no error listener", function (done) {
        const shouldAcceptMessageFn = simple.mock();

        collector.listenForResponses("etc", shouldAcceptMessageFn);

        expect((logger.warn as any).calls).length(1);
        done();
      });

      it("should listen with onResponseMessage", function (done) {
        const shouldAcceptMessageFn = simple.mock();
        const originalOnResponseMessageFn = collector.onResponseMessage;

        collector.listenForResponses("etc", shouldAcceptMessageFn);

        expect(channelManager.findOrCreateConsumer.called).to.be.true;
        expect(channelManager.findOrCreateConsumer.lastCall.args[0]).equals("etc");

        expect(mockChannel.on.called).to.be.true;
        expect(mockChannel.on.lastCall.args[0]).equals("message");
        expect(mockChannel.on.lastCall.args[1]).to.be.a("function");

        const message = {};
        const handlerFn = mockChannel.on.lastCall.args[1];
        handlerFn(message);

        expect(originalOnResponseMessageFn.called).to.be.true;
        expect(originalOnResponseMessageFn.lastCall.args[0]).equals(shouldAcceptMessageFn);
        expect(originalOnResponseMessageFn.lastCall.args[1]).equals(message);

        expect(collector.waitForAcksUntil).equals(null);

        done();
      });

      it("should initialize the ackTimeout where appropriate", function (done) {
        const shouldAcceptMessageFn = simple.mock();

        collector.waitForAcksMs = 100;

        collector.listenForResponses("etc", shouldAcceptMessageFn);

        expect(collector.waitForAcksUntil).instanceOf(Date);
        expect(collector.waitForAcksUntil - 100 - Date.now()).below(10);

        done();
      });
    });

    describe("removeListeners()", function () {

      it("removes the responseChannel if it exists", function (done) {
        const mockResponseChannel: any = {};
        simple.mock(mockResponseChannel, "removeListener").returnWith();
        collector.responseChannel = mockResponseChannel;

        collector.removeListeners();

        expect(mockResponseChannel.removeListener.called).to.be.true;
        expect(mockResponseChannel.removeListener.lastCall.args[0]).equals("message");
        expect(mockResponseChannel.removeListener.lastCall.args[1]).equals(collector.onResponseMessage);

        expect(function () {
          collector.removeListeners();
        }).to.not.throw();

        done();
      });
    });

    describe("onResponseMessage", function () {
      let shouldAcceptMessageFn;
      let message;

      beforeEach(function (done) {
        shouldAcceptMessageFn = simple.mock();

        simple.mock(collector, "emit").returnWith();
        simple.mock(collector, "incResponsesRemaining").returnWith();
        simple.mock(collector, "processAck").returnWith();
        simple.mock(collector, "isAwaitingResponses");
        simple.mock(collector, "isAwaitingAcks");
        simple.mock(collector, "enableAckTimeout").returnWith();
        simple.mock(collector, "end").returnWith();

        message = {
          ack: "ack",
          payload: {},
        };

        done();
      });

      it("should accept message when passed function returns true", function (done) {

        shouldAcceptMessageFn.returnWith(true);
        collector.isAwaitingResponses.returnWith(0);

        collector.onResponseMessage(shouldAcceptMessageFn, message);

        expect(shouldAcceptMessageFn.called).to.be.true;
        expect(collector.payloadMessages).length(1);
        expect(collector.emit.called).to.be.true;
        expect(collector.emit.lastCall.args[0]).equals("payload");
        expect(collector.emit.lastCall.args[1]).equals(message.payload);
        expect(collector.emit.lastCall.args[2]).equals(message);
        expect(collector.incResponsesRemaining.called).to.be.true;
        expect(collector.incResponsesRemaining.lastCall.args[0]).equals(-1);
        expect(collector.processAck.called).to.be.true;
        expect(collector.processAck.lastCall.args[0]).equals(message.ack);
        expect(collector.isAwaitingResponses.called).to.be.true;
        expect(collector.end.called).to.be.true;

        done();
      });

      it("should accept message when no function is passed", function (done) {

        collector.isAwaitingResponses.returnWith(0);

        collector.onResponseMessage(null, message);

        expect(collector.payloadMessages).length(1);
        expect(collector.emit.called).to.be.true;
        expect(collector.emit.calls[0].args[0]).equals("payload");
        expect(collector.emit.lastCall.args[0]).equals("payload");
        expect(collector.emit.lastCall.args[1]).equals(message.payload);
        expect(collector.emit.lastCall.args[2]).equals(message);
        expect(collector.incResponsesRemaining.called).to.be.true;
        expect(collector.incResponsesRemaining.lastCall.args[0]).equals(-1);
        expect(collector.processAck.called).to.be.true;
        expect(collector.processAck.lastCall.args[0]).equals(message.ack);
        expect(collector.isAwaitingResponses.called).to.be.true;
        expect(collector.end.called).to.be.true;

        done();
      });

      it("should handle ack when no payload is passed", function (done) {
        message.payload = null;

        collector.onResponseMessage(null, message);

        expect(collector.ackMessages).length(1);
        expect(collector.emit.called).to.be.true;
        expect(collector.emit.lastCall.args[0]).equals("ack");
        expect(collector.emit.lastCall.args[1]).equals(message.ack);
        expect(collector.emit.lastCall.args[2]).equals(message);
        expect(collector.processAck.called).to.be.true;
        expect(collector.processAck.lastCall.args[0]).equals(message.ack);
        expect(collector.isAwaitingResponses.called).to.be.true;

        done();
      });

      it("should not accept message when passed function returns false", function (done) {

        shouldAcceptMessageFn.returnWith(false);

        collector.onResponseMessage(shouldAcceptMessageFn, message);

        expect(collector.payloadMessages).length(0);

        done();
      });

      it("should not end when still awaiting responses", function (done) {

        collector.isAwaitingResponses.returnWith(1);

        collector.onResponseMessage(shouldAcceptMessageFn, message);

        expect(collector.end.calls).length(0);

        done();
      });

      it("should enable ack timeout when still awaiting acks", function (done) {

        collector.isAwaitingResponses.returnWith(0);
        collector.isAwaitingAcks.returnWith(true);

        collector.onResponseMessage(null, message);

        expect(collector.payloadMessages).length(1);
        expect(collector.enableAckTimeout.called).to.be.true;
        expect(collector.end.calls).length(0);

        done();
      });

      it("should not proceed if already canceled (e.g. error happened during event)", function (done) {

        collector.cancel();

        collector.onResponseMessage(null, message);

        expect(collector.processAck.calls).length(0);
        expect(collector.isAwaitingResponses.calls).length(0);
        expect(collector.isAwaitingAcks.calls).length(0);
        expect(collector.end.calls).length(0);

        done();
      });
    });
  });
});
