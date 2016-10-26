import {expect} from "chai";
const simple = require("simple-mock");
import {configure, Requester, logger} from "../..";
import {createLocalResponder} from "./_support/localResponder";

describe("Local", function() {
  before(function(done) {
    simple.mock(logger, "warn").returnWith();

    configure({
      brokerAdapter: "local"
    });
    done();
  });

  after(function(done) {
    simple.restore();
    done();
  });

  describe("responder", function() {
    let requester;
    let responder;

    before(function(done) {
      responder = createLocalResponder();
      responder.listen();
      done();
    });

    after(function(done) {
      responder.close();
      done();
    });

    beforeEach(function(done) {
      requester = new Requester({ namespace: "test:general", ackTimeout: 100, waitForResponsesMs: 500 });
      done();
    });

    it("will validate the request payload", function(done) {
      requester
      .publish({
        headers: {},
        body: "not_object"
      })
      .once("error", done)
      .once("end", function() {
        expect(requester.ackMessages).length(0);
        expect(requester.payloadMessages).length(1);
        expect(requester.payloadMessages[0].payload).deep.equals({
          statusCode: 422,
          body: null
        });
        done();
      });
    });

    it("can use custom error handler", function(done) {
      requester
      .publish({
        headers: {},
        body: { instruction: "error" }
      })
      .once("error", done)
      .once("end", function() {
        expect(requester.ackMessages).length(0);
        expect(requester.payloadMessages).length(1);
        expect(requester.payloadMessages[0].payload).deep.equals({
          statusCode: 500,
          body: "Special Message"
        });
        done();
      });
    });

    it("can return normally", function(done) {
      requester
      .publish({
        headers: {},
        body: {}
      })
      .once("error", done);

      requester = new Requester({
        namespace: "test:general",
        ackTimeout: 100,
        waitForResponsesMs: 500,
        tags: ["a"]
      });
      requester
      .publish({
        headers: {},
        body: {}
      })
      .once("error", done)
      .once("end", function() {
        expect(requester.ackMessages).length(1);
        expect(requester.payloadMessages).length(1);
        expect(requester.payloadMessages[0].payload).deep.equals({
          statusCode: 200,
          body: 1002
        });
        expect(requester.payloadMessages[0].tags.sort()).deep.equals(["a", "b"]);
        done();
      });
    });
  });
});
