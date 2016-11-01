import {JsonSchema} from "tv4";
import serviceDetails = require("./support/serviceDetails");
import {resolve} from "path";
const _ = require("lodash");

type adapterName = "amqp" | "local";
type amqpExchangeType = "fanout" | "topic";

export interface BrokerConfig {
  [key: string]: any;
}

export interface ConfigAMQP extends BrokerConfig {
  [key: string]: any;
  host?: string;
  port?: number;
  sslPort?: number;
  login?: string;
  password?: string;
  vhost?: string;
  ssl?: boolean;
  groupId?: string;
  durable?: boolean;
  heartbeat?: number;
  prefetchCount?: number;
  autoConfirm?: boolean;
  type?: amqpExchangeType;
  channel?: string; //todo: this property should not be passed via broker config
  bindingKeys?: string[];
}

export interface LocalConfig extends BrokerConfig {
  channel?: string; //todo: this property should not be passed via broker config
}

export class Config {
  schema: JsonSchema;
  cleanupConsumers: boolean;
  autoMessageContext: boolean;
  brokerAdapter: adapterName;
  amqp: ConfigAMQP;
  local: LocalConfig;

  constructor() {
    this.schema = require("../schema");
    this.cleanupConsumers = false;
    this.autoMessageContext = true;
    this.brokerAdapter = process.env.MSB_BROKER_ADAPTER || "amqp";

    this.amqp = {
      host: process.env.MSB_BROKER_HOST || "127.0.0.1",
      port: process.env.MSB_BROKER_PORT || 5672,
      sslPort: process.env.MSB_BROKER_PORT || 5672, //todo: refactoring while lib will change
      login: process.env.MSB_BROKER_USER_NAME || "guest",
      password: process.env.MSB_BROKER_PASSWORD || "guest",
      vhost: process.env.MSB_BROKER_VIRTUAL_HOST || "/",
      ssl: this.sslValue(),
      groupId: serviceDetails.name,
      durable: false,
      heartbeat: 10000, // In milliseconds
      prefetchCount: 1,
      autoConfirm: true,
      type: "fanout"
    };

    this.local = {};

    this._init();
  }

  configure(obj: Object): void {
    _.merge(this, obj);
  }

  /**
   * @todo Make private?
   */
  _init(): void {
    if (process.env.MSB_CONFIG_PATH) {
      const configPath = resolve(process.env.MSB_CONFIG_PATH);
      const jsonObj = require(configPath);
      delete(require.cache[configPath]);
      this.configure(jsonObj);
    }
  }

  private sslValue(): boolean {
    const DEFAULT_SSL_VALUE = false;
    if (!process.env.MSB_BROKER_USE_SSL) {
      return false;
    }
    let ssl: string = process.env.MSB_BROKER_USE_SSL;
    if (ssl.toLowerCase() === "true" || ssl === "1") {
      return true;
    }
    if (ssl.toLowerCase() === "false" || ssl === "0") {
      return false;
    }
    return DEFAULT_SSL_VALUE;
  }
}

export function create(): Config {
  return new Config();
}
