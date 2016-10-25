import {BrokerAdapter, BrokerPublisherAdapterFactory, BrokerSubscriberAdapter} from "../adapter";
import {BrokerConfig, ConfigAMQP} from "../../config";
import {AMQPPublisherAdapter} from "./publisher";
import {AMQPSubscriberAdapter} from "./subscriber";
import {Message} from "../../messageFactory";

const AMQP = require("amqp-coffee");
const _ = require("lodash");

class AMQPBrokerAdapter implements BrokerAdapter {
  private connection: any;

  Publish(config: BrokerConfig): BrokerPublisherAdapterFactory {
    const publisher = new AMQPPublisherAdapter(<ConfigAMQP>config, this.sharedConnection(config));

    return {
      channel: function(topic) {
        return {
          publish: (message: Message, cb: (err?: Error) => void) => {
            publisher.publish(topic, message, cb);
          },
          close: () => publisher.close()
        };
      }
    };
  }

  Subscribe(config: BrokerConfig): BrokerSubscriberAdapter {
    return new AMQPSubscriberAdapter(<ConfigAMQP>config, this.sharedConnection(config));
  }

  close(): void {
    if (!this.connection) return;
    this.connection.close();
  }

  private sharedConnection(config: BrokerConfig): any {
    if (this.connection) return this.connection;

    this.connection = new AMQP(_.clone(config));
    this.connection.setMaxListeners(0);
    return this.connection;
  }
}

export function create(): BrokerAdapter {
  return new AMQPBrokerAdapter();
}
