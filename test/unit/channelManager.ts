import {expect} from "chai";
import {EventEmitter} from "events";
const simple = require("simple-mock");
import * as amqp from "../../lib/adapters/amqp";
import * as config from "../../lib/config";
// import {create as createChannelManager} from "../lib/channelManager";
const createChannelManager = (require("../../lib/channelManager")).create;
import * as messageFactory from "../../lib/messageFactory";
import {BrokerAdapter, BrokerPublisherAdapterFactory, BrokerSubscriberAdapter} from "../../lib/adapters/adapter";
describe("channelManager", function () {
  let queue: BrokerAdapter;
  let channelManager;

  before(function (done) {
    queue = amqp.create();
    done();
  });

  beforeEach(function (done) {
    channelManager = createChannelManager();

    simple.mock(amqp, "create").returnWith(queue);
    simple.mock(config, "amqp", {
      host: "mock.host",
      port: "99999"
    });
    simple.mock(config, "schema", null);
    simple.mock(config, "cleanupConsumers", true);

    channelManager.configure(config);

    done();
  });

  afterEach(function (done) {
    simple.restore();
    done();
  });

  describe("hasChannels", function () {
    it("should return false when no channels have been created", function (done) {
      expect(channelManager.hasChannels()).to.be.false;
      done();
    });

    it("should return true when publisher channels have been created", function (done) {
      simple.mock(channelManager._producersByTopic, "a:test:producer");

      expect(channelManager.hasChannels()).to.be.true;
      done();
    });

    it("should return true when publisher channels have been created", function (done) {
      simple.mock(channelManager._consumersByTopic, "a:test:consumer");

      expect(channelManager.hasChannels()).to.be.true;
      done();
    });
  });

  describe("findOrCreateProducer", function () {
    beforeEach(function (done) {
      done();
    });

    it("can reuse channels per topic", function (done) {
      let mockPublisher = <BrokerPublisherAdapterFactory> {};

      simple.mock(queue, "Publish").returnWith(mockPublisher);

      simple
        .mock(mockPublisher, "channel")
        .returnWith({})
        .returnWith({})
        .returnWith(null);

      const producer1a = channelManager.findOrCreateProducer("prod1:1");

      expect((mockPublisher.channel as any).called).to.be.true;
      expect((mockPublisher.channel as any).lastCall.args[0]).equals("prod1:1");

      const producer2 = channelManager.findOrCreateProducer("prod1:2");

      expect((mockPublisher.channel as any).called).to.be.true;
      expect((mockPublisher.channel as any).lastCall.args[0]).equals("prod1:2");

      const producer1b = channelManager.findOrCreateProducer("prod1:1");

      expect((amqp.create as any).callCount).equals(1);
      expect((queue.Publish as any).callCount).equals(2);
      expect((queue.Publish as any).lastCall.args[0]).to.deep.include({host: "mock.host"});
      expect((mockPublisher.channel as any).callCount).equals(2);
      expect(producer2).to.not.equal(producer1a);
      expect(producer1a).equals(producer1b);

      done();
    });

    it("will emit a new channel event", function (done) {
      simple.mock(channelManager, "createRawProducer").returnWith({});

      expect(channelManager.PRODUCER_NEW_TOPIC_EVENT).to.exist;

      const onEvent = simple.mock();
      channelManager.on(channelManager.PRODUCER_NEW_TOPIC_EVENT, onEvent);

      channelManager.findOrCreateProducer("etc");

      expect(onEvent.called).to.be.true;
      expect(onEvent.lastCall.args[0]).equals("etc");
      done();
    });
  });

  describe("findOrCreateConsumer", function () {
    beforeEach(function (done) {
      simple.mock(channelManager, "onNewChannel").returnWith();
      done();
    });

    it("can reuse subscribers per topic", function (done) {
      let mockSubscriber1 = {};
      let mockSubscriber2 = {};

      simple.mock(mockSubscriber1, "setMaxListeners");
      simple.mock(mockSubscriber1, "on");
      simple.mock(mockSubscriber2, "setMaxListeners");
      simple.mock(mockSubscriber2, "on");

      simple
        .mock(queue, "Subscribe")
        .returnWith(mockSubscriber1)
        .returnWith(mockSubscriber2)
        .returnWith(null);

      const consumer1a = channelManager.findOrCreateConsumer("con1:1");

      expect((queue.Subscribe as any).called).to.be.true;
      expect((queue.Subscribe as any).lastCall.args[0]).deep.include({
        channel: "con1:1",
        host: "mock.host",
        port: "99999"
      });

      const consumer2 = channelManager.findOrCreateConsumer("con1:2");

      expect((queue.Subscribe as any).lastCall.args[0]).deep.include({
        channel: "con1:2",
        host: "mock.host",
        port: "99999"
      });

      const consumer1b = channelManager.findOrCreateConsumer("con1:1");

      expect((amqp.create as any).callCount).equals(1);
      expect((queue.Subscribe as any).callCount).equals(2);
      expect(consumer2).to.not.equal(consumer1a);
      expect(consumer1a).equals(consumer1b);
      done();
    });

    it("can override default options", function (done) {
      let mockSubscriber1 = {};
      let mockSubscriber2 = {};

      simple.mock(mockSubscriber1, "setMaxListeners");
      simple.mock(mockSubscriber1, "on");
      simple.mock(mockSubscriber2, "setMaxListeners");
      simple.mock(mockSubscriber2, "on");

      simple
        .mock(queue, "Subscribe")
        .returnWith(mockSubscriber1)
        .returnWith(mockSubscriber2)
        .returnWith(null);

      const consumer1a = channelManager.findOrCreateConsumer("con1:1");

      expect((queue.Subscribe as any).called).to.be.true;
      expect((queue.Subscribe as any).lastCall.args[0]).deep.include({
        durable: false,
        type: "fanout"
      });

      const consumer2 = channelManager.findOrCreateConsumer("con1:2", {type: "topic", durable: true});

      expect((queue.Subscribe as any).lastCall.args[0]).deep.include({
        durable: true,
        type: "topic"
      });

      done();
    });

    it("will emit a new channel event", function (done) {
      let mockSubscriber = {};
      simple.mock(mockSubscriber, "setMaxListeners");
      simple.mock(mockSubscriber, "on");
      simple.mock(channelManager, "createRawConsumer").returnWith(mockSubscriber);

      expect(channelManager.CONSUMER_NEW_TOPIC_EVENT).to.exist;

      let onEvent = simple.mock();
      channelManager.once(channelManager.CONSUMER_NEW_TOPIC_EVENT, onEvent);
      channelManager.findOrCreateConsumer("etc");

      expect(onEvent.called).to.be.true;
      expect(onEvent.lastCall.args[0]).equals("etc");
      done();
    });

    it("will listen for messages and emit a new message event", function (done) {
      let mockSubscriber = <BrokerSubscriberAdapter>{};
      simple.mock(mockSubscriber, "on");
      simple.mock(channelManager, "createRawConsumer").returnWith(mockSubscriber);

      let consumer = channelManager.findOrCreateConsumer("c:etc");

      expect((mockSubscriber.on as any).callCount).equals(2);
      expect((mockSubscriber.on as any).calls[0].arg).equals("message");
      expect((mockSubscriber.on as any).calls[1].arg).equals("error");
      expect(consumer.listeners("removeListener")).length(1);
      expect(channelManager.CONSUMER_NEW_MESSAGE_EVENT).to.exist;

      let onMessageFn = (mockSubscriber.on as any).calls[0].args[1];
      let onNewMessageEvent = simple.mock();
      channelManager.once(channelManager.CONSUMER_NEW_MESSAGE_EVENT, onNewMessageEvent);

      let onMessageEvent = simple.mock();
      consumer.on("message", onMessageEvent);

      simple.mock(messageFactory, "startContext");
      simple.mock(messageFactory, "endContext");

      // With expired message
      onMessageFn({meta: {ttl: 1000, createdAt: new Date(Date.now() - 1001)}});
      expect(onNewMessageEvent.called).to.be.false;
      expect(onMessageEvent.called).to.be.false;

      // With normal message
      onMessageFn({});
      expect(onNewMessageEvent.called).to.be.true;
      expect(onNewMessageEvent.lastCall.args[0]).equals("c:etc");
      expect(onMessageEvent.called).to.be.true;
      expect((messageFactory.startContext as any).called).to.be.true;
      expect((messageFactory.endContext as any).called).to.be.true;
      expect(onMessageEvent.lastCall.k).above((messageFactory.startContext as any).lastCall.k);
      expect(onMessageEvent.lastCall.k).below((messageFactory.endContext as any).lastCall.k);

      // With autoMessageContext turned off
      simple.mock(channelManager._config, "autoMessageContext", false);
      onMessageFn({});
      expect(onMessageEvent.callCount).equals(2);
      expect((messageFactory.startContext as any).callCount).equals(1);
      expect((messageFactory.endContext as any).callCount).equals(1);

      done();
    });

    describe("when the listeners are removed", function () {
      it("will remove the cached channel", function (done) {
        expect(channelManager.CONSUMER_REMOVED_TOPIC_EVENT).to.exist;

        let mockSubscriber = <BrokerSubscriberAdapter>new EventEmitter();
        simple.mock(mockSubscriber, "close").returnWith();
        simple.mock(channelManager, "createRawConsumer").returnWith(mockSubscriber);

        let onEvent = simple.mock();
        channelManager.on(channelManager.CONSUMER_REMOVED_TOPIC_EVENT, onEvent);

        const channel = channelManager.findOrCreateConsumer("cr:etc");

        // Do nothing for other events
        channel.on("other", function () {
        });
        channel.removeAllListeners("other");

        const singleListener = function () {
        };
        channel.on("message", singleListener);
        channel.removeListener("message", singleListener);
        channel.removeListener("message", singleListener);

        setImmediate(function () {
          expect((mockSubscriber.close as any).callCount).equals(1);
          expect((channelManager.createRawConsumer as any).callCount).equals(1);
          expect(onEvent.callCount).equals(1);

          // Cache was cleared
          channelManager.findOrCreateConsumer("cr:etc");
          expect((channelManager.createRawConsumer as any).callCount).equals(2);

          done();
        });
      });

      it("will remove multiple cached channels in one go", function (done) {
        simple.mock(EventEmitter.prototype, "close").returnWith();

        simple
          .mock(channelManager, "createRawConsumer")
          .returnWith(new EventEmitter())
          .returnWith(new EventEmitter());

        const onEvent = simple.mock();
        channelManager.on(channelManager.CONSUMER_REMOVED_TOPIC_EVENT, onEvent);

        const channelA = channelManager.findOrCreateConsumer("crm:a");
        const channelB = channelManager.findOrCreateConsumer("crm:b");

        const singleListener = function () {
        };

        channelA.on("message", singleListener);
        channelA.removeListener("message", singleListener);
        channelA.on("message", singleListener); // Added listener after remove
        channelA.removeListener("message", singleListener); // Removed again
        channelA.on("message", singleListener); // Added again

        channelB.on("message", singleListener);
        channelB.removeListener("message", singleListener);

        setImmediate(function () {
          expect((EventEmitter.prototype as any).close.callCount).equals(1);
          expect(channelManager.createRawConsumer.callCount).equals(2);
          expect(onEvent.callCount).equals(1);
          expect(onEvent.lastCall.args[0]).equals("crm:b");

          // Cache not cleared
          channelManager.findOrCreateConsumer("crm:a");
          expect(channelManager.createRawConsumer.callCount).equals(2);

          // Cache was cleared
          channelManager.findOrCreateConsumer("crm:b");
          expect(channelManager.createRawConsumer.callCount).equals(3);

          done();
        });
      });
    });
  });
});
