import {expect} from "chai";
import * as sinon from "sinon";
import {Builder} from "../../../lib/api/subscriber";
import {BrokerConfig, ConfigAMQP} from "../../../lib/config";
const channelManager = require("../../../lib/channelManager").default;

const TOPIC = "test:topic";

describe("api.Subscriber", () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should create consumer with defaults only if configuration is not provided", () => {

    // arrange and assert
    sandbox.stub(channelManager, "findOrCreateConsumer", (topic, brokerConfig: ConfigAMQP) => {
      expect(topic).to.equal(TOPIC);
      expect(brokerConfig.prefetchCount).to.equal(1);
      expect(brokerConfig.autoConfirm).to.be.true;
      expect(brokerConfig.durable).to.be.false;
      expect(brokerConfig.groupId).to.be.false;
      expect(brokerConfig.bindingKeys).to.be.empty;
      expect(brokerConfig.type).to.be.equal("fanout");
    });

    // act
    new Builder(TOPIC).createEmitter();
  });
  it("should create consumer including configuration if it was provided", () => {

    // arrange and assert
    sandbox.stub(channelManager, "findOrCreateConsumer", (topic, brokerConfig: ConfigAMQP) => {
      expect(topic).to.equal(TOPIC);
      expect(brokerConfig.prefetchCount).to.equal(1);
      expect(brokerConfig.autoConfirm).to.be.false;
      expect(brokerConfig.durable).to.be.true;
      expect(brokerConfig.groupId).to.equal("example-string-alt");
      expect(brokerConfig.bindingKeys).to.be.empty;
      expect(brokerConfig.type).to.be.equal("topic");
    });

    // act
    new Builder(TOPIC)
      .withGroupId("example-string-alt")
      .withDurable(true)
      .withAutoConfirm(false)
      .withExchangeType("topic")
      .createEmitter();
  });

});
