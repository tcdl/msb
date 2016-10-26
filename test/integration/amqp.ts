import {expect} from "chai";
import {AMQPSubscriberAdapter} from "../../lib/adapters/amqp/subscriber";
import validateWithSchema = require("../../lib/validateWithSchema");

const createChannelManager = require("../../lib/channelManager").create;
const simple = require("simple-mock");
const _ = require("lodash");
import * as amqpPublisher from "./_support/amqpPublisher";

const fixtures = {
  consumer_basic: require("./_fixtures/integration_consumer_basic.json"),
  consumer_schema: require("./_fixtures/integration_consumer_schema")
};

describe("AMQP Integration", function() {

  afterEach(function(done) {
    simple.restore();
    done();
  });

  describe("a consumer with default configuration", function() {
    let _onMessageMethod;
    let channelManager;
    let consumer;
    let publisher;

    before(function(done) {
      amqpPublisher.create("integration:test:consumer", function(err, p) {
        if (err) return done(err);

        publisher = p;

        done();
      });
    });

    beforeEach(function(done) {

      _onMessageMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "onMessage");

      channelManager = createChannelManager().configure({
        brokerAdapter: "amqp",
        amqp: {
          prefetchCount: 1
        }
      });

      consumer = channelManager
        .findOrCreateConsumer("integration:test:consumer", {
          groupId: "integration-test"
        })
        .onceConsuming(done);
    });

    afterEach(function(done) {
      channelManager.close();
      done();
    });

    after(function(done) {
      publisher.close();
      done();
    });

    it("will automatically confirm incoming messages", function(done) {

      const confirmMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "confirmProcessedMessage");

      const onMessageMethod = simple.mock();

      consumer.on("message", onMessageMethod);

      publisher.publish([
        fixtures.consumer_basic,
        fixtures.consumer_basic,
        fixtures.consumer_basic
      ], function(err) {
        if (err) return done(err);

        setTimeout(function() {
          expect(onMessageMethod.callCount).equals(3);
          expect(onMessageMethod.calls[0].arg).deep.equals(fixtures.consumer_basic);
          expect(onMessageMethod.calls[1].arg).deep.equals(fixtures.consumer_basic);
          expect(onMessageMethod.calls[2].arg).deep.equals(fixtures.consumer_basic);
          expect(confirmMethod.callCount).equals(3);
          done();
        }, 100);
      });
    });

    it("will reject incoming messages that cannot be parsed as JSON", function(done) {

      const confirmMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "confirmProcessedMessage");

      const rejectMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "rejectMessage");

      const onMessageMethod = simple.mock();

      consumer.on("message", onMessageMethod);

      publisher.publish([
        fixtures.consumer_basic,
        "breaking",
        fixtures.consumer_basic
      ], function(err) {
        if (err) return done(err);

        setTimeout(function() {
          expect(onMessageMethod.callCount).equals(2);
          expect(onMessageMethod.calls[0].arg).deep.equals(fixtures.consumer_basic);
          expect(onMessageMethod.calls[1].arg).deep.equals(fixtures.consumer_basic);
          expect(_onMessageMethod.callCount).equals(3);
          // Check order of messages received in adapter vs channelManager
          expect(_onMessageMethod.calls[1].k).above(onMessageMethod.calls[0].k);
          expect(_onMessageMethod.calls[1].k).below(onMessageMethod.calls[1].k);
          expect(confirmMethod.callCount).equals(2);
          done();
        }, 100);
      });
    });

    it("will reject incoming messages that are not objects", function(done) {

      const confirmMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "confirmProcessedMessage");

      const rejectMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "rejectMessage");

      const onMessageMethod = simple.mock();

      consumer.on("message", onMessageMethod);

      publisher.publish([
        fixtures.consumer_basic,
        "breaking",
        fixtures.consumer_basic
      ], function(err) {
        if (err) return done(err);

        setTimeout(function() {
          expect(onMessageMethod.callCount).equals(2);
          expect(onMessageMethod.calls[0].arg).deep.equals(fixtures.consumer_basic);
          expect(onMessageMethod.calls[1].arg).deep.equals(fixtures.consumer_basic);
          expect(_onMessageMethod.callCount).equals(3);
          // Check order of messages received in adapter vs channelManager
          expect(_onMessageMethod.calls[1].k).above(onMessageMethod.calls[0].k);
          expect(_onMessageMethod.calls[1].k).below(onMessageMethod.calls[1].k);
          expect(confirmMethod.callCount).equals(2);
          done();
        }, 100);
      });
    });

    it("will reject incoming messages that do not conform to envelope schema", function(done) {

      const confirmMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "confirmProcessedMessage");

      const rejectMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "rejectMessage");

      const onMessageMethod = simple.mock();

      consumer.on("message", onMessageMethod);

      publisher.publish([
        fixtures.consumer_basic,
        {breaking: "meh"},
        fixtures.consumer_basic
      ], function(err) {
        if (err) return done(err);

        setTimeout(function() {
          expect(onMessageMethod.callCount).equals(2);
          expect(onMessageMethod.calls[0].arg).deep.equals(fixtures.consumer_basic);
          expect(onMessageMethod.calls[1].arg).deep.equals(fixtures.consumer_basic);
          expect(rejectMethod.callCount).equals(1);
          expect(confirmMethod.callCount).equals(2);
          expect(rejectMethod.lastCall.k).above(confirmMethod.calls[0].k);
          expect(rejectMethod.lastCall.k).below(confirmMethod.calls[1].k);
          done();
        }, 100);
      });
    });

    it("will reject expired incoming messages", function(done) {

      const confirmMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "confirmProcessedMessage");

      const rejectMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "rejectMessage");

      const onMessageMethod = simple.mock();

      consumer.on("message", onMessageMethod);

      const expiredMessage = _.merge({}, fixtures.consumer_basic, {
        meta: {ttl: 10000}
      });

      publisher.publish([
        fixtures.consumer_basic,
        expiredMessage,
        fixtures.consumer_basic
      ], function(err) {
        if (err) return done(err);

        setTimeout(function() {
          expect(onMessageMethod.callCount).equals(2);
          expect(onMessageMethod.calls[0].arg).deep.equals(fixtures.consumer_basic);
          expect(onMessageMethod.calls[1].arg).deep.equals(fixtures.consumer_basic);
          expect(rejectMethod.callCount).equals(1);
          expect(confirmMethod.callCount).equals(2);
          expect(rejectMethod.lastCall.k).above(confirmMethod.calls[0].k);
          expect(rejectMethod.lastCall.k).below(confirmMethod.calls[1].k);
          done();
        }, 100);
      });
    });

    it("will reject incoming messages that fail onEvent validation", function(done) {

      const confirmMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "confirmProcessedMessage");

      const rejectMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "rejectMessage");

      const onMessageMethod = simple.mock();

      const validationMethod = validateWithSchema.onEvent(fixtures.consumer_schema, onMessageMethod);

      consumer.on("message", validationMethod);

      const validMessage = _.merge({}, fixtures.consumer_basic, {
        payload: {
          body: {}
        }
      });

      publisher.publish([
        validMessage,
        fixtures.consumer_basic,
        validMessage
      ], function(err) {
        if (err) return done(err);

        setTimeout(function() {
          expect(onMessageMethod.callCount).equals(2);
          expect(onMessageMethod.calls[0].arg).deep.equals(validMessage);
          expect(onMessageMethod.calls[1].arg).deep.equals(validMessage);
          expect(rejectMethod.callCount).equals(1);
          expect(confirmMethod.callCount).equals(3);
          expect(rejectMethod.lastCall.k).above(confirmMethod.calls[0].k);
          expect(rejectMethod.lastCall.k).below(confirmMethod.calls[1].k);
          done();
        }, 100);
      });
    });
  });

  describe("a consumer with autoConfirm off", function() {
    let _onMessageMethod;
    let channelManager;
    let consumer;
    let publisher;

    before(function(done) {
      amqpPublisher.create("integration:test:consumer", function(err, p) {
        if (err) return done(err);

        publisher = p;

        done();
      });
    });

    beforeEach(function(done) {

      _onMessageMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "onMessage");

      channelManager = createChannelManager().configure({
        brokerAdapter: "amqp",
        amqp: {
          prefetchCount: 1
        }
      });

      consumer = channelManager
        .findOrCreateConsumer("integration:test:consumer", {
          groupId: "integration-test",
          autoConfirm: false
        })
        .onceConsuming(done);
    });

    afterEach(function(done) {
      channelManager.close();
      done();
    });

    after(function(done) {
      publisher.close();
      done();
    });

    it("will not automatically confirm incoming messages", function(done) {

      const confirmMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "confirmProcessedMessage");

      const onMessageMethod = simple.mock();

      consumer.on("message", onMessageMethod);

      publisher.publish([
        fixtures.consumer_basic,
        fixtures.consumer_basic
      ], function(err) {
        if (err) return done(err);

        setTimeout(function() {
          expect(onMessageMethod.callCount).equals(1);
          expect(onMessageMethod.calls[0].arg).deep.equals(fixtures.consumer_basic);
          expect(confirmMethod.callCount).equals(0);
          done();
        }, 100);
      });
    });

    it("allows for manual confirmation and rejection", function(done) {

      const confirmMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "confirmProcessedMessage");

      const rejectMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "rejectMessage");

      const onMessageMethod = simple.mock();

      onMessageMethod.callFn(function(message) {
        consumer.confirmProcessedMessage(message);
      });
      onMessageMethod.callFn(function(message) {
        consumer.rejectMessage(message);
      });
      onMessageMethod.callFn(function(message) {
        consumer.confirmProcessedMessage(message);
      });

      consumer.on("message", onMessageMethod);

      publisher.publish([
        fixtures.consumer_basic,
        fixtures.consumer_basic,
        fixtures.consumer_basic
      ], function(err) {
        if (err) return done(err);

        setTimeout(function() {
          expect(onMessageMethod.callCount).equals(3);
          expect(onMessageMethod.calls[0].arg).deep.equals(fixtures.consumer_basic);
          expect(onMessageMethod.calls[1].arg).deep.equals(fixtures.consumer_basic);
          expect(onMessageMethod.calls[2].arg).deep.equals(fixtures.consumer_basic);
          expect(confirmMethod.callCount).equals(2);
          expect(rejectMethod.callCount).equals(1);
          done();
        }, 100);
      });
    });

    it("will reject incoming messages that cannot be parsed as JSON", function(done) {

      const confirmMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "confirmProcessedMessage");

      const rejectMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "rejectMessage");

      const onMessageMethod = simple.mock().callFn(function(message) {
        consumer.confirmProcessedMessage(message);
      });

      consumer.on("message", onMessageMethod);

      publisher.publish([
        fixtures.consumer_basic,
        "breaking",
        fixtures.consumer_basic
      ], function(err) {
        if (err) return done(err);

        setTimeout(function() {
          expect(onMessageMethod.callCount).equals(2);
          expect(onMessageMethod.lastCall.arg).deep.equals(fixtures.consumer_basic);
          expect(_onMessageMethod.callCount).equals(3);
          // Check order of messages received in adapter vs channelManager
          expect(_onMessageMethod.calls[1].k).above(onMessageMethod.calls[0].k);
          expect(_onMessageMethod.calls[1].k).below(onMessageMethod.calls[1].k);
          expect(confirmMethod.callCount).equals(2);
          done();
        }, 100);
      });
    });

    it("will reject incoming messages that are not objects", function(done) {

      const confirmMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "confirmProcessedMessage");

      const rejectMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "rejectMessage");

      const onMessageMethod = simple.mock().callFn(function(message) {
        consumer.confirmProcessedMessage(message);
      });

      consumer.on("message", onMessageMethod);

      publisher.publish([
        fixtures.consumer_basic,
        "breaking",
        fixtures.consumer_basic
      ], function(err) {
        if (err) return done(err);

        setTimeout(function() {
          expect(onMessageMethod.callCount).equals(2);
          expect(onMessageMethod.calls[0].arg).deep.equals(fixtures.consumer_basic);
          expect(onMessageMethod.calls[1].arg).deep.equals(fixtures.consumer_basic);
          expect(_onMessageMethod.callCount).equals(3);
          // Check order of messages received in adapter vs channelManager
          expect(_onMessageMethod.calls[1].k).above(onMessageMethod.calls[0].k);
          expect(_onMessageMethod.calls[1].k).below(onMessageMethod.calls[1].k);
          expect(confirmMethod.callCount).equals(2);
          done();
        }, 100);
      });
    });

    it("will reject incoming messages that do not conform to envelope schema", function(done) {

      const confirmMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "confirmProcessedMessage");

      const rejectMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "rejectMessage");

      const onMessageMethod = simple.mock().callFn(function(message) {
        consumer.confirmProcessedMessage(message);
      });

      consumer.on("message", onMessageMethod);

      publisher.publish([
        fixtures.consumer_basic,
        {breaking: "meh"},
        fixtures.consumer_basic
      ], function(err) {
        if (err) return done(err);

        setTimeout(function() {
          expect(onMessageMethod.callCount).equals(2);
          expect(onMessageMethod.calls[0].arg).deep.equals(fixtures.consumer_basic);
          expect(onMessageMethod.calls[1].arg).deep.equals(fixtures.consumer_basic);
          expect(rejectMethod.callCount).equals(1);
          expect(confirmMethod.callCount).equals(2);
          expect(rejectMethod.lastCall.k).above(confirmMethod.calls[0].k);
          expect(rejectMethod.lastCall.k).below(confirmMethod.calls[1].k);
          done();
        }, 100);
      });
    });

    it("will reject expired incoming messages", function(done) {

      const confirmMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "confirmProcessedMessage");

      const rejectMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "rejectMessage");

      const onMessageMethod = simple.mock().callFn(function(message) {
        consumer.confirmProcessedMessage(message);
      });

      consumer.on("message", onMessageMethod);

      const expiredMessage = _.merge({}, fixtures.consumer_basic, {
        meta: {ttl: 10000}
      });

      publisher.publish([
        fixtures.consumer_basic,
        expiredMessage,
        fixtures.consumer_basic
      ], function(err) {
        if (err) return done(err);

        setTimeout(function() {
          expect(onMessageMethod.callCount).equals(2);
          expect(onMessageMethod.calls[0].arg).deep.equals(fixtures.consumer_basic);
          expect(onMessageMethod.calls[1].arg).deep.equals(fixtures.consumer_basic);
          expect(rejectMethod.callCount).equals(1);
          expect(confirmMethod.callCount).equals(2);
          expect(rejectMethod.lastCall.k).above(confirmMethod.calls[0].k);
          expect(rejectMethod.lastCall.k).below(confirmMethod.calls[1].k);
          done();
        }, 100);
      });
    });

    it("will not reject incoming messages that fail onEvent validation", function(done) {

      const confirmMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "confirmProcessedMessage");

      const rejectMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "rejectMessage");

      const onMessageMethod = simple.mock().callFn(function(message) {
        consumer.confirmProcessedMessage(message);
      });

      const validationMethod = validateWithSchema.onEvent(fixtures.consumer_schema, onMessageMethod);

      consumer.on("message", validationMethod);

      const validMessage = _.merge({}, fixtures.consumer_basic, {
        payload: {
          body: {}
        }
      });

      publisher.publish([
        validMessage,
        fixtures.consumer_basic,
        validMessage
      ], function(err) {
        if (err) return done(err);

        setTimeout(function() {
          expect(onMessageMethod.callCount).equals(1);
          expect(onMessageMethod.calls[0].arg).deep.equals(validMessage);
          expect(rejectMethod.callCount).equals(0);
          expect(confirmMethod.callCount).equals(1);
          done();
        }, 100);
      });
    });

    it("can manually reject incoming messages that fail onEvent validation", function(done) {

      const confirmMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "confirmProcessedMessage");

      const rejectMethod = simple.mock(AMQPSubscriberAdapter.prototype,
        "rejectMessage");

      const onMessageMethod = simple.mock().callFn(function(message) {
        consumer.confirmProcessedMessage(message);
      });

      const onErrorMethod = simple.mock().callFn(function(err, message) {
        consumer.rejectMessage(message);
      });

      const validationMethod = validateWithSchema.onEvent(fixtures.consumer_schema, onMessageMethod);

      consumer.on("message", validationMethod);
      consumer.on("error", onErrorMethod);

      const validMessage = _.merge({}, fixtures.consumer_basic, {
        payload: {
          body: {}
        }
      });

      publisher.publish([
        validMessage,
        fixtures.consumer_basic,
        validMessage
      ], function(err) {
        if (err) return done(err);

        setTimeout(function() {
          expect(onMessageMethod.callCount).equals(2);
          expect(onMessageMethod.calls[0].arg).deep.equals(validMessage);
          expect(onMessageMethod.calls[1].arg).deep.equals(validMessage);
          expect(rejectMethod.callCount).equals(1);
          expect(confirmMethod.callCount).equals(2);
          expect(rejectMethod.lastCall.k).above(confirmMethod.calls[0].k);
          expect(rejectMethod.lastCall.k).below(confirmMethod.calls[1].k);
          done();
        }, 100);
      });
    });
  });
});
