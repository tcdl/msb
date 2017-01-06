import {expect} from "chai";
import request from "../../lib/request";
import {Requester} from "../../lib/requester";

const simple = require("simple-mock");

describe("request()", function () {
  beforeEach(function (done) {
    simple.mock(Requester.prototype, "publish");
    done();
  });

  afterEach(function (done) {
    simple.restore();
    done();
  });

  describe("with only a topic", function () {
    beforeEach(function (done) {
      (<any> Requester.prototype.publish).callFn(function () {
        return this;
      });
      done();
    });

    it("calls back on end with a response", function (done) {
      const requester = request("my:topic", {
        my: "payload",
      }, (err, responsePayload, responseMessage) => {
        if (err) return done(err);

        expect(responsePayload).equals("payload");
        expect(responseMessage).equals("message");
        done();
      });

      expect(requester instanceof Requester).to.be.true;
      expect(requester.timeoutMs).equals(3000);
      expect(requester.waitForResponses).equals(1);

      requester.emit("payload", "payload", "message");
      requester.end();
    });

    it("calls back on error", function (done) {
      const requester = request("my:topic", {
        my: "payload",
      }, (err, responsePayload, responseMessage) => {

        expect(err instanceof Error).to.be.true;
        done();
      });

      expect(requester instanceof Requester).to.be.true;
      expect(requester.timeoutMs).equals(3000);
      expect(requester.waitForResponses).equals(1);

      requester.emit("error", new Error());
    });
  });

  describe("with config", function () {
    let config: any;

    beforeEach(function (done) {
      config = {
        namespace: "my:topic",
        responseSchema: {type: "object"},
        channelManager: {},
        waitForResponses: 5,
        waitForResponsesMs: 5000,
      };
      (<any> Requester.prototype.publish).callFn(function () {
        return this;
      });
      done();
    });

    it("calls back on end with a response", function (done) {
      const mockPayload = {};

      const requester = request(config, {
        my: "payload",
      }, (err, responsePayload, responseMessage) => {
        if (err) return done(err);

        expect(responsePayload).equals(mockPayload);
        expect(responseMessage).equals("message");
        done();
      });

      expect(requester instanceof Requester).to.be.true;
      expect(requester.channelManager).equals(config.channelManager);
      expect(requester.timeoutMs).equals(5000);
      expect(requester.waitForResponses).equals(5);

      requester.emit("payload", mockPayload, "message");
      requester.end();
    });

    it("calls back on validation error", function (done) {
      const requester = request(config, {
        my: "payload",
      }, (err, responsePayload, responseMessage) => {

        expect(err instanceof Error).to.be.true;
        done();
      });

      expect(requester instanceof Requester).to.be.true;
      expect(requester.timeoutMs).equals(5000);
      expect(requester.waitForResponses).equals(5);

      requester.emit("payload", "willfail", "message");
    });
  });
});
