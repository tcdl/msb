import {BrokerConfig, ConsumerOptions} from "../../config";

export interface AMQPConfig extends BrokerConfig {
  vhost?: string;
  groupId?: string;
  durable?: boolean;
  heartbeat?: number;
  prefetchCount?: number;
  type?: "fanout" | "topic";
}

export interface AMQPConsumerOptions extends ConsumerOptions {
  bindingKeys?: string[];
  type?: "fanout" | "topic"
}
