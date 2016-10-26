import {
  BrokerAdapter, BrokerPublisherAdapterFactory,
  BrokerSubscriberAdapterFactory
} from "../adapter";
import {BrokerConfig, ConsumerOptions, ProducerOptions} from "../../config";
import {AMQPPublisherAdapter} from "./publisher";
import {AMQPSubscriberAdapter} from "./subscriber";
import {Message} from "../../messageFactory";
import serviceDetails = require("../../support/serviceDetails");

const AMQP = require("amqp-coffee");
const _ = require("lodash");

class AMQPBrokerAdapter implements BrokerAdapter {
  private connection: any;

  Publish(config: BrokerConfig): BrokerPublisherAdapterFactory {

    return {
      channel: function(namespace: string, options: ProducerOptions) {
        const publisher = new AMQPPublisherAdapter(<AMQPConfig>config, <AMQPProducerOptions>options, this.sharedConnection(config));
        return {
          publish: (message: Message, cb: (err?: Error) => void) => {
            publisher.publish(namespace, message, cb);
          },
          close: () => publisher.close()
        };
      }
    };
  }

  Subscribe(config: BrokerConfig): BrokerSubscriberAdapterFactory {
    return {
      channel: function(namespace: string, options: ConsumerOptions) {
        return new AMQPSubscriberAdapter(<AMQPConfig>config, namespace, <AMQPConsumerOptions>options, this.sharedConnection(config));
      }
    };
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

export function loadConfig(): BrokerConfig {
  return new AMQPConfig();
}

type amqpExchangeType = "fanout" | "topic"

export class AMQPConfig extends BrokerConfig {
  vhost?: string;
  groupId?: string;
  durable?: boolean;
  heartbeat?: number;
  prefetchCount?: number;
  type?: amqpExchangeType;

  constructor() {
    super();
    this.vhost = process.env.MSB_AMQP_VHOST || "/";
    this.groupId = serviceDetails.name;
    this.durable = false;
    this.heartbeat = 10000;
    this.prefetchCount = 1;
    this.type = "fanout";
  }
}

export interface AMQPConsumerOptions extends ConsumerOptions {
  bindingKeys?: string[];
  type?: amqpExchangeType;
}

export interface AMQPProducerOptions extends ProducerOptions {
  type?: amqpExchangeType;
}
