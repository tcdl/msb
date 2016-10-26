import {BrokerPublisherAdapter} from "../../../lib/adapters/adapter";
import {create as configCreate} from "../../../lib/config";
const _ = require("lodash");
const async = require("async");
const AMQP = require("amqp-coffee");

export function create(topic, cb) {
  const connection = new AMQP(configCreate().amqp);

  connection.once("ready", () => {
    const publisher: BrokerPublisherAdapter = {
      publish: function () {
        cb = _.last(arguments);
        const messages = (_.isArray(arguments[0])) ? arguments[0] : Array.prototype.slice.call(arguments, 0, -1);

        async.eachSeries(messages, (message, next) => {
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
