import {expect} from "chai";
import {AMQPPublisherAdapter} from "../lib/adapters/amqp/publisher";

const config = require("../lib/config").create();
const simple = require("simple-mock");
const AMQP = require("amqp-coffee");

describe("AMQPPublisherAdapter", function() {
  let connection;
  let publisher;
  let exchange;

  describe("publish()", function() {

    before(function(done) {
      connection = new AMQP(config.amqp);
      publisher = new AMQPPublisherAdapter(config.amqp, connection);
      exchange = {};
      done();
    });

    beforeEach(function(done) {
      simple.restore();
      simple.mock(connection, "publish");
      simple.mock(connection, "exchange");
      simple.mock(exchange, "declare");
      simple.mock(publisher, "publishMessageStr");
      done();
    });

    it("can publish where an exchange already exists", function(done) {

      connection.publish.callbackWith();

      publisher.publish("existing", {
        message: "etc"
      }, (err) => {
        if (err) return done(err);
        done();
      });
    });

    describe("where an exchange does not initially exist", function() {
      beforeEach(function(done) {

        connection.exchange.returnWith(exchange);
        exchange.declare.callbackWith();

        done();
      });

      it("can publish a single message", function(done) {
        connection.publish.callbackWith({
          error: {
            replyCode: 404
          }
        });
        connection.publish.callbackWith();

        publisher.publish("non-existent1", {
          message: "etc"
        }, (err) => {
          if (err) return console.error(err) || done(err);

          expect(publisher.publishMessageStr.callCount).equals(2);
          expect(connection.publish.callCount).equals(2);
          expect(connection.exchange.callCount).equals(1);
          done();
        });
      });

      it("can publish multiple messages in queue", function(done) {
        connection.publish.callbackWith({
          error: {
            replyCode: 404
          }
        });
        connection.publish.callbackWith({
          error: {
            replyCode: 404
          }
        });
        connection.publish.callbackWith();
        connection.publish.callbackWith();

        const cb = simple.mock();

        publisher.publish("non-existent2", {
          message: 1
        }, cb);

        publisher.publish("non-existent2", {
          message: 2
        }, cb);

        setTimeout(() => {
          expect(cb.callCount).equals(2);
          expect(publisher.publishMessageStr.callCount).equals(4);
          expect(connection.publish.callCount).equals(4);
          expect(connection.exchange.callCount).equals(2); // Will call for each failed message
          done();
        }, 100);
      });
    });
  });
});
