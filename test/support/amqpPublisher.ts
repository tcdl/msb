const _ = require("lodash");
const async = require("async");
const EventEmitter = require("events").EventEmitter;
const AMQP = require("amqp-coffee");
const config = require("../../lib/config").create();
exports.create = function(topic, cb) {
  const connection = new AMQP(config.amqp);

  connection.once("ready", function() {
    const publisher = {
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
