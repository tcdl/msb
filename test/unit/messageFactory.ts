import {expect} from "chai";
import * as messageFactory from "../../lib/messageFactory";
import MessageMeta = messageFactory.MessageMeta;
import MessageConfig = messageFactory.MessageConfig;
import Message = messageFactory.Message;
import serviceDetails = require("../../lib/support/serviceDetails");

describe("messageFactory", function () {
  it("should create message for pub/sub", function (done) {
    const message = messageFactory.createMessage("my:topic", {message: "hello"});

    expect(message.id).to.be.a("string");
    expect(message.topics.to).to.be.equal("my:topic");
    expect(message.correlationId).to.be.a("string");
    expect(message.meta).to.be.an("object");
    expect(message.meta.createdAt).to.be.instanceOf(Date);
    expect(message.meta.serviceDetails).to.be.deep.equal(serviceDetails);
    expect(message.payload).to.be.deep.equal({message: "hello"});
    done();
  });

  it("should create message for pub/sub with config", function (done) {
    const message = messageFactory.createMessage("my:topic", {}, {ttl: 3000, routingKey: "routing:key", tags: ["tag"]});

    expect(message.meta.ttl).to.be.equal(3000);
    expect(message.tags).to.be.deep.equal(["tag"]);
    expect(message.topics.routingKey).to.be.equal("routing:key");
    done();
  });

  it("should create request message", function (done) {
    const message = messageFactory.createRequestMessage("my:topic", {message: "hello"});

    expect(message.topics.to).to.be.equal("my:topic");
    expect(message.topics.response).to.be.a("string");
    expect(message.correlationId).to.be.a("string");
    expect(message.meta).to.be.an("object");
    expect(message.meta.createdAt).to.be.instanceOf(Date);
    expect(message.meta.serviceDetails).to.be.deep.equal(serviceDetails);
    expect(message.payload).to.be.deep.equal({message: "hello"});
    done();
  });

  it("should create request message with config", function (done) {
    const message = messageFactory.createRequestMessage("my:topic", {message: "hello"}, {ttl: 3000, routingKey: "routing:key", tags: ["tag"]});

    expect(message.meta.ttl).to.be.equal(3000);
    expect(message.tags).to.be.deep.equal(["tag"]);
    expect(message.topics.routingKey).to.be.equal("routing:key");
    done();
  });

  it("should create response message", function (done) {
    const originalMessage = {
      id: "123",
      correlationId: "abc",
      tags: ["tag"],
      topics: {to: "my:topic", response: "my:topic:response"},
    };

    const message = messageFactory.createResponseMessage(originalMessage, {message: "hello"}, {responderId: "123"});

    expect(message.topics.to).to.be.equal(originalMessage.topics.response);
    expect(message.correlationId).to.be.equal(originalMessage.correlationId);
    expect(message.meta).to.be.an("object");
    expect(message.meta.createdAt).to.be.instanceOf(Date);
    expect(message.meta.serviceDetails).to.be.deep.equal(serviceDetails);
    expect(message.payload).to.be.deep.equal({message: "hello"});
    expect(message.ack).to.be.deep.equal({responderId: "123"});
    done();
  });

  it("should create ack message", function (done) {
    const originalMessage = {
      id: "123",
      correlationId: "abc",
      tags: ["tag"],
      topics: {to: "my:topic", response: "my:topic:response"},
    };

    const message = messageFactory.createAckMessage(originalMessage, {responderId: "123"});

    expect(message.topics.to).to.be.equal(originalMessage.topics.response);
    expect(message.correlationId).to.be.equal(originalMessage.correlationId);
    expect(message.meta).to.be.an("object");
    expect(message.meta.createdAt).to.be.instanceOf(Date);
    expect(message.meta.serviceDetails).to.be.deep.equal(serviceDetails);
    expect(message.payload).to.be.equal(null);
    expect(message.ack).to.be.deep.equal({responderId: "123"});
    done();
  });
});
