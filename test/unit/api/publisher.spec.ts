import {expect} from "chai";
import * as sinon from "sinon";
import {Builder} from "../../../lib/api/publisher";
const channelManager = require("../../../lib/channelManager").default;

const TOPIC = "test:topic";
const TTL = 10000;
const PAYLOAD = {message: "test"};

describe("api.Publisher", () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should publish message with defaults only if default configuration is used", () => {

    // arrange and assert
    sandbox.stub(channelManager, "findOrCreateProducer", (topic, brokerConfig) => {
      // assert channelManager properties
      expect(topic).to.equal(TOPIC);
      expect(brokerConfig).to.eql({type: "fanout"});

      return {
        publish: (message) => {
          // assert message meta
          expect(message.meta.ttl).to.be.null;
          expect(message.meta.publishedAt).to.not.be.null;
          expect(message.meta.durationMs).to.not.be.null;

          // assert message topic, tags
          expect(message.topics.to).to.equal(TOPIC);
          expect(message.topics.routingKey).to.be.undefined;
          expect(message.tags).to.eql([]);

          // assert payload
          expect(message.payload).to.eql(PAYLOAD);
        },
      };
    });

    // act
    new Builder(TOPIC).publish(PAYLOAD);

  });

  it("should publish message including configuration if it was provided", () => {

    // arrange
    let spyPublish = sandbox.spy();

    const stubFindOrCreateProducer = sandbox.stub(channelManager, "findOrCreateProducer");
    stubFindOrCreateProducer
      .withArgs(TOPIC, {type: "topic"}, null)
      .returns({publish: spyPublish});

    // act
    new Builder(TOPIC)
      .withTtl(TTL)
      .withExchangeType("topic")
      .withRoutingKey("event:updated")
      .withTags(["tag1", "tag2"])
      .publish(PAYLOAD);

    // assert
    const spyMessage = spyPublish.getCall(0).args[0];

    // message meta
    expect(spyMessage.meta.ttl).to.equal(TTL);
    expect(spyMessage.meta.publishedAt).to.not.be.null;
    expect(spyMessage.meta.durationMs).to.not.be.null;

    // message topic, tags, payload
    expect(spyMessage.topics.to).to.equal(TOPIC);
    expect(spyMessage.topics.routingKey).to.equal("event:updated");
    expect(spyMessage.tags).to.eql(["tag1", "tag2"]);
    expect(spyMessage.payload).to.eql(PAYLOAD);

  });

  it("11 should publish message including configuration if it was provided", () => {

    // arrange
    const mockedFindOrCreateProducer = sandbox.mock(channelManager).expects("findOrCreateProducer")
      .once()
      .withArgs("test:topic", {type: "topic"}, null);

    const mockedPublish = sinon.expectation.create("publish")
      .withArgs(sinon.match({meta: {ttl: 10000})
          .and(sinon.match({tags: ["tag1", "tag2"]}))
          .and(sinon.match({topics: {routingKey: "event:updated", to: "test:topic"}})));

    mockedFindOrCreateProducer.returns({publish: mockedPublish});

    // act
    new Builder(TOPIC)
      .withTtl(TTL)
      .withExchangeType("topic")
      .withRoutingKey("event:updated")
      .withTags(["tag1", "tag2"])
      .publish(PAYLOAD);

    mockedFindOrCreateProducer.once();
    mockedFindOrCreateProducer.verify();

    mockedPublish.once();
    mockedPublish.verify();

  });
});
