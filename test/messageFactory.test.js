"use strict";
var chai_1 = require("chai");
var messageFactory = require("../lib/messageFactory");
describe("messageFactory", function () {
    describe("completeMeta()", function () {
        var messageConfig;
        var originalMessage;
        var meta;
        beforeEach(function (done) {
            messageConfig = { namespace: "my:topic" };
            originalMessage = {
                id: "123",
                correlationId: "123",
                tags: ["tag"],
                topics: { to: "to" }
            };
            meta = messageFactory.createMeta(messageConfig);
            done();
        });
        it("should add meta to the message", function (done) {
            var message = messageFactory.completeMeta(originalMessage, meta);
            chai_1.expect(message.meta).to.exist;
            chai_1.expect(message.meta).deep.equals(meta);
            done();
        });
        it("should add to to the topics", function (done) {
            var message = messageFactory.createDirectedMessage(messageConfig, originalMessage);
            chai_1.expect(message.topics.to).to.exist;
            chai_1.expect(message.topics.to).equals(messageConfig.namespace);
            done();
        });
        it("should add forward to the topics on middlewareNamespace", function (done) {
            messageConfig.middlewareNamespace = "custom:topic";
            var message = messageFactory.createDirectedMessage(messageConfig, originalMessage);
            chai_1.expect(message.topics.forward).to.exist;
            chai_1.expect(message.topics.forward).equals(messageConfig.namespace);
            chai_1.expect(message.topics.to).to.exist;
            chai_1.expect(message.topics.to).equals(messageConfig.middlewareNamespace);
            done();
        });
        it("should not add forward to the topics without on middlewareNamespace", function (done) {
            var message = messageFactory.createDirectedMessage(messageConfig, originalMessage);
            chai_1.expect(message.topics.forward).not.to.exist;
            done();
        });
        it("should add publishedAt date", function (done) {
            chai_1.expect(meta.publishedAt).equals(null);
            var message = messageFactory.completeMeta(originalMessage, meta);
            chai_1.expect(message.meta).to.exist;
            chai_1.expect(message.meta.publishedAt instanceof Date).to.be.true;
            chai_1.expect(Date.now() - message.meta.publishedAt.valueOf()).below(15);
            done();
        });
    });
});
