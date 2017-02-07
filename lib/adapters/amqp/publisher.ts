import {ConfigAMQP} from "../../config";
import {Message} from "../../messageFactory";

export class AMQPPublisherAdapter {
  private config: ConfigAMQP;
  private connection: any;

  constructor(config: ConfigAMQP, connection: any) {
    this.config = config;
    this.connection = connection;
  }

  close(): void {
    // Do nothing
  }

  publish(topic: string, message: Message, cb: (err?: Error) => void): void {
    const messageStr = JSON.stringify(message);
    const routingKey = message.topics && message.topics.routingKey ? message.topics.routingKey : "";

    this.publishMessageStr(topic, messageStr, routingKey, cb);
  }

  private publishMessageStr(topic: string, messageStr: string, routingKey: string, cb: (err?: Error) => void): void {
    this.connection.publish(topic, routingKey, messageStr, { deliveryMode: 2, confirm: true }, (err) => {
      if (err && err.error && err.error.replyCode === 404) {
        return this.ensureExchange(topic, (error): void => {
          if (error) return cb(error);

          this.publishMessageStr(topic, messageStr, routingKey, cb);
        });
      }
      if (err) return cb(err);
      cb();
    });
  }

  private ensureExchange(topic: string, cb: Function): void {
    const exchange = this.connection.exchange({
      exchange: topic,
      type: this.config.type,
    });

    exchange.declare(cb);
  }
}
