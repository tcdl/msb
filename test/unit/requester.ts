import {expect} from "chai";
import * as messageFactory from "../../lib/messageFactory";
const channelManager = require("../../lib/channelManager").default;
import {Requester} from "../../lib/requester";
const simple = require("simple-mock");

describe("Requester", function() {

  afterEach(function(done) {
    simple.restore();
    done();
  });

  describe("publish()", function() {
    let producer;

    beforeEach(function(done) {
      producer = {};

      simple.mock(producer, "publish");
      simple.mock(channelManager, "findOrCreateProducer", function(topic) {
        return producer;
      });

      done();
    });

    it("can create a proper message", function(done) {
      simple.mock(messageFactory, "createRequestMessage");

      const obj = new Requester({
        namespace: "my:topic",
        waitForResponses: 0,
      });

      obj.publish({message: "hello"});

      expect((messageFactory.createRequestMessage as any).called).to.equal(true);
      expect((messageFactory.createRequestMessage as any).lastCall.args[0]).to.equal("my:topic");
      expect((messageFactory.createRequestMessage as any).lastCall.args[1]).to.deep.equal({message: "hello"});
      done();
    });

    it("can emit error", function(done) {
      const errHandler = simple.mock();
      const expectedErr = new Error();
      producer.publish.callbackWith(expectedErr);

      const obj = new Requester({
        namespace: "my:topic",
        waitForResponses: 0,
      });

      obj
      .on("error", errHandler)
      .publish({});

      expect(producer.publish.called).to.equal(true);
      expect(errHandler.called).to.equal(true);
      expect(errHandler.lastCall.args[0]).to.equal(expectedErr);

      done();
    });

    it("can emit message immediately", function(done) {
      producer.publish.callbackWith();

      const endHandler = simple.mock();

      const obj = new Requester({
        namespace: "my:topic",
        waitForResponses: 0,
      });

      obj
      .on("end", endHandler)
      .publish({});

      expect(producer.publish.called).to.equal(true);
      expect(endHandler.called).to.equal(true);

      done();
    });

    it("can start collecting responses", function(done) {
      producer.publish.callbackWith();

      const endHandler = simple.mock();

      const obj = new Requester({
        namespace: "my:topic",
        waitForResponses: 1,
      });

      simple.mock(obj, "listenForResponses").returnWith();
      simple.mock(messageFactory, "createRequestMessage").returnWith({
        topics: {to: "my:topic", response: "my:topic:response"},
      });

      obj
      .on("end", endHandler)
      .publish({});

      expect((obj.listenForResponses as any).called).to.equal(true);
      expect((obj.listenForResponses as any).lastCall.args[0]).to.equal("my:topic:response");
      expect(producer.publish.called).to.equal(true);
      expect(endHandler.called).to.equal(false);

      done();
    });

    it("can wait for acks without any determined number of responses", function(done) {
      producer.publish.callbackWith();

      const endHandler = simple.mock();

      const obj = new Requester({
        namespace: "my:topic",
        waitForResponses: 0,
        waitForAcksMs: 800,
      });

      simple.mock(obj, "listenForResponses").returnWith();
      simple.mock(obj, "isAwaitingAcks").returnWith(true);
      simple.mock(messageFactory, "createRequestMessage").returnWith({
        topics: {to: "my:topic", response: "my:topic:response"},
      });

      obj
      .on("end", endHandler)
      .publish({});

      expect((obj.listenForResponses as any).called).to.equal(true);
      expect((obj.listenForResponses as any).lastCall.args[0]).to.equal("my:topic:response");
      expect(producer.publish.called).to.equal(true);
      expect(endHandler.called).to.equal(false);

      done();
    });

    it("can accept response by correlation ID", function(done) {
      producer.publish.callbackWith();

      const obj = new Requester({
        namespace: "my:topic",
        waitForResponses: 1,
      });

      simple.mock(obj, "listenForResponses").returnWith();
      simple.mock(messageFactory, "createRequestMessage").returnWith({
        correlationId: "123",
        topics: {to: "my:topic", response: "my:topic:response"},
      });

      obj.publish({});

      expect((obj.listenForResponses as any).called).to.equal(true);
      expect((obj.listenForResponses as any).lastCall.args[1]).to.be.a("function");

      const shouldAcceptMessageFn = (obj.listenForResponses as any).lastCall.args[1];

      expect(shouldAcceptMessageFn({correlationId: "123"})).to.be.equal(true);
      expect(shouldAcceptMessageFn({correlationId: "other"})).to.be.equal(false);

      done();
    });
  });
});
