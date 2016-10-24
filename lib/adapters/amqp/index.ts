import {BrokerAdapter, BrokerAdapterPublisherFactory, BrokerAdapterSubscriber} from "../adapter";
import {BrokerConfig, ConfigAMQP} from "../../config";
import {AMQPPublisherAdapter} from "./publisher";
import {AMQPSubscriberAdapter} from "./subscriber";

const AMQP = require("amqp-coffee");
const _ = require("lodash");

class AMQPBrokerAdapter implements BrokerAdapter {
  connection;

  Publish(config: BrokerConfig): BrokerAdapterPublisherFactory {
    const publisher = new AMQPPublisherAdapter(<ConfigAMQP>config, this.sharedConnection(config));

    return {
      channel: function(topic) {
        return {
          publish: publisher.publish.bind(publisher, topic),
          close: publisher.close.bind(publisher)
        };
      }
    };
  }

  Subscribe(config: BrokerConfig): BrokerAdapterSubscriber {
    return new AMQPSubscriberAdapter(<ConfigAMQP>config, this.sharedConnection(config));
  }

  close(): void {
    if (!this.connection) return;
    this.connection.close();
  }

  private sharedConnection(config) {
    if (this.connection) return this.connection;

    this.connection = new AMQP(_.clone(config));
    this.connection.setMaxListeners(0);
    return this.connection;
  }
}

export function create(): BrokerAdapter {
  return new AMQPBrokerAdapter();
}
