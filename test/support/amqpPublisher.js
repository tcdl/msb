var _ = require('lodash');
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var AMQP = require('amqp-coffee');
var config = require('../../lib/config').create()
exports.create = function(topic, cb) {
  var connection = new AMQP(config.amqp);

  connection.once('ready', function() {
    var publisher = {
      publish: function() {
        cb = _.last(arguments);
        var messages = (_.isArray(arguments[0])) ? arguments[0] : Array.prototype.slice.call(arguments, 0, -1);

        async.eachSeries(messages, function(message, next) {
          var str = (_.isObject(message)) ? JSON.stringify(message) : message;
          connection.publish(topic, '', str, {
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
