import {create as config} from "../../lib/config";
import {BrokerAdapterPublisher} from "../../lib/adapters/adapter";
const async = require("async");
const _ = require("lodash");
const AMQP = require("amqp-coffee");

exports.create = function(topic: string, cb: (error?: Error, pub?: BrokerAdapterPublisher) => void): void {
  const connection = new AMQP(config().amqp);

  connection.once("ready", () => {
    const publisher: BrokerAdapterPublisher = {
      publish: function() {
        cb = _.last(arguments);
        const messages = (_.isArray(arguments[0])) ? arguments[0] : Array.prototype.slice.call(arguments, 0, -1);

        async.eachSeries(messages, function(message, next) {
          const str = (_.isObject(message)) ? JSON.stringify(message) : message;
          connection.publish(topic, "", str, {
            deliveryMode: 2,
            confirm: true
          }, next);
        }, cb);
      },
      close: connection.close.bind(connection)
    };

    cb(null, publisher);
  });
};
