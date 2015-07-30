function AMQPPublisher(config, connection) {
  this.config = config;
  this.connection = connection;
  this._exchangeByTopic = {};
}

var publisher = AMQPPublisher.prototype;

publisher.close = function(cb) {
  // Do nothing
  cb();
};

publisher.publish = function(topic, message, cb) {
  var messageStr = JSON.stringify(message);

  this._publishMessageStr(topic, messageStr, cb);
};

publisher._publishMessageStr = function(topic, messageStr, cb) {
  var self = this;

  this.connection.publish(topic, '', messageStr, { deliveryMode: 2, confirm: true }, function(err) {
     if (err && err.error && err.error.replyCode === 404) {
        return self._ensureExchange(topic, function(err) {
          if (err) return cb(err);

          self._publishMessageStr(topic, messageStr, cb);
        });
     }
     if (err) return cb(err);
     cb();
  });
};

publisher._ensureExchange = function(topic, cb) {
  var self = this;

  var exchange = self.connection.exchange({
    exchange: topic,
    type: 'fanout'
  });

  exchange.declare(cb);
};

exports.AMQPPublisher = AMQPPublisher;
