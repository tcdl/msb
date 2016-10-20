import {JsonSchema} from "tv4";

interface ServiceDetails {
  hostname: string;
  ip: string;
  pid: number;
  name: string;
  version: string;
  instanceId: string;
}

interface MSBConfig {
  schema?: JsonSchema;
  cleanupConsumers?: boolean;
  autoMessageContext?: boolean;
  brokerAdapter?: brokerAdapters;
  amqp?: ConfigAMQP;
  local?: Object;

  configure(obj: any): void;
  _init(): void;
}

type brokerAdapters = "amqp" | "local";
type amqpExchangeType = "fanout" | "topic";

interface ConfigAMQP {
  [key: string]: any;
  host?: string;
  port?: number;
  login?: string;
  password?: string;
  vhost?: string;
  groupId?: string;
  durable?: boolean;
  heartbeat?: number;
  prefetchCount?: number;
  autoConfirm?: boolean;
  type?: amqpExchangeType;
}
