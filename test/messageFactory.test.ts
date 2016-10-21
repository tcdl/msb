import {expect} from "chai";
import * as messageFactory from "../lib/messageFactory";
import {msb} from "../msb";
import MessageMeta = msb.MessageMeta;
import MessageConfig = msb.MessageConfig;
import Message = msb.Message;

describe("messageFactory", () => {

  describe("completeMeta()", () => {
    let messageConfig: MessageConfig;
    let originalMessage: Message;
    let meta: MessageMeta;

    beforeEach((done) => {
      messageConfig = {namespace: "my:topic"};
      originalMessage = {
        id: "123",
        correlationId: "123",
        tags: ["tag"],
        topics: {to: "to"}
      };
      meta = messageFactory.createMeta(messageConfig);
      done();
    });

    it("should add meta to the message", (done) => {

      const message = messageFactory.completeMeta(originalMessage, meta);

      expect(message.meta).to.exist;
      expect(message.meta).deep.equals(meta);

      done();
    });

    it("should add to to the topics", (done) => {
      const message = messageFactory.createDirectedMessage(messageConfig, originalMessage);

      expect(message.topics.to).to.exist;
      expect(message.topics.to).equals(messageConfig.namespace);

      done();
    });

    it("should add forward to the topics on middlewareNamespace", (done) => {
      messageConfig.middlewareNamespace = "custom:topic";
      const message = messageFactory.createDirectedMessage(messageConfig, originalMessage);

      expect(message.topics.forward).to.exist;
      expect(message.topics.forward).equals(messageConfig.namespace);
      expect(message.topics.to).to.exist;
      expect(message.topics.to).equals(messageConfig.middlewareNamespace);

      done();
    });

    it("should not add forward to the topics without on middlewareNamespace", (done) => {
      const message = messageFactory.createDirectedMessage(messageConfig, originalMessage);

      expect(message.topics.forward).not.to.exist;

      done();
    });

    it("should add publishedAt date", (done) => {

      expect(meta.publishedAt).equals(null);

      const message = messageFactory.completeMeta(originalMessage, meta);

      expect(message.meta).to.exist;
      expect(message.meta.publishedAt instanceof Date).to.be.true;
      expect(Date.now() - message.meta.publishedAt.valueOf()).below(15);

      done();
    });
  });
});
