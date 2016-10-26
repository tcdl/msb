import {expect} from "chai";
import * as messageFactory from "../../lib/messageFactory";
import MessageMeta = messageFactory.MessageMeta;
import MessageConfig = messageFactory.MessageConfig;
import Message = messageFactory.Message;

describe("messageFactory", function () {

  describe("completeMeta()", function () {
    let messageConfig: MessageConfig;
    let originalMessage: Message;
    let meta: MessageMeta;

    beforeEach(function (done) {
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

    it("should add meta to the message", function (done) {

      const message = messageFactory.completeMeta(originalMessage, meta);

      expect(message.meta).to.exist;
      expect(message.meta).deep.equals(meta);

      done();
    });

    it("should add to to the topics", function (done) {
      const message = messageFactory.createDirectedMessage(messageConfig, originalMessage);

      expect(message.topics.to).to.exist;
      expect(message.topics.to).equals(messageConfig.namespace);

      done();
    });

    it("should add forward to the topics on middlewareNamespace", function (done) {
      messageConfig.middlewareNamespace = "custom:topic";
      const message = messageFactory.createDirectedMessage(messageConfig, originalMessage);

      expect(message.topics.forward).to.exist;
      expect(message.topics.forward).equals(messageConfig.namespace);
      expect(message.topics.to).to.exist;
      expect(message.topics.to).equals(messageConfig.middlewareNamespace);

      done();
    });

    it("should not add forward to the topics without on middlewareNamespace", function (done) {
      const message = messageFactory.createDirectedMessage(messageConfig, originalMessage);

      expect(message.topics.forward).not.to.exist;

      done();
    });

    it("should add publishedAt date", function (done) {

      expect(meta.publishedAt).equals(null);

      const message = messageFactory.completeMeta(originalMessage, meta);

      expect(message.meta).to.exist;
      expect(message.meta.publishedAt instanceof Date).to.be.true;
      expect(Date.now() - message.meta.publishedAt.valueOf()).below(15);

      done();
    });
  });
});
