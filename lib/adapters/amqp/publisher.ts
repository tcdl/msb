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

    this.publishMessageStr(topic, messageStr, routingKey, cb);
  }

  private publishMessageStr(topic, messageStr, routingKey, cb) {
    const self = this;

    this.connection.publish(topic, routingKey, messageStr, { deliveryMode: 2, confirm: true }, (err) => {
      if (err && err.error && err.error.replyCode === 404) {
        return self.ensureExchange(topic, function(err) {
          if (err) return cb(err);

          self.publishMessageStr(topic, messageStr, routingKey, cb);
        });
      }
      if (err) return cb(err);
      cb();
    });
  }

  private ensureExchange(topic, cb) {
    const exchange = this.connection.exchange({
      exchange: topic,
      type: this.config.type
    });

    exchange.declare(cb);
  }
}
