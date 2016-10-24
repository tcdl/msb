import {Message} from "../../messageFactory";
import {ConfigAMQP} from "../../config";

export class AMQPPublisherAdapter {
  config: ConfigAMQP;
  connection;

  constructor(config: ConfigAMQP, connection) {
    this.config = config;
    this.connection = connection;
  }

  close() {
    // Do nothing
  }

  publish(topic: string, message: Message, cb): void {
    const messageStr = JSON.stringify(message);
    const routingKey = message.topics && message.topics.routingKey ? message.topics.routingKey : "";

    this.publishMessageStr(topic, messageStr, routingKey, cb);
  }

  private publishMessageStr(topic: string, messageStr: string, routingKey: string, cb): void {
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

  private ensureExchange(topic: string, cb) {
    const exchange = this.connection.exchange({
      exchange: topic,
      type: this.config.type
    });

    exchange.declare(cb);
  }
}
