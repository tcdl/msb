export class AMQPPublisherAdapter {
  config;
  connection;
  _exchangeByTopic;

  constructor(config, connection) {
    this.config = config;
    this.connection = connection;
    this._exchangeByTopic = {};
  }

  close() {
    // Do nothing
  }

  publish(topic, message, cb) {
    const messageStr = JSON.stringify(message);
    const routingKey = message.topics && message.topics.routingKey ? message.topics.routingKey : "";

    this._publishMessageStr(topic, messageStr, routingKey, cb);
  }

  _publishMessageStr(topic, messageStr, routingKey, cb) {
    const self = this;

    this.connection.publish(topic, routingKey, messageStr, { deliveryMode: 2, confirm: true }, (err) => {
      if (err && err.error && err.error.replyCode === 404) {
        return self._ensureExchange(topic, function(err) {
          if (err) return cb(err);

          self._publishMessageStr(topic, messageStr, routingKey, cb);
        });
      }
      if (err) return cb(err);
      cb();
    });
  }

  _ensureExchange(topic, cb) {
    const exchange = this.connection.exchange({
      exchange: topic,
      type: this.config.type
    });

    exchange.declare(cb);
  }
}
