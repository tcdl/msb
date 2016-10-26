import {JsonSchema} from "tv4";
import serviceDetails = require("./support/serviceDetails");
import {resolve} from "path";
const _ = require("lodash");

type adapterName = "amqp" | "local";

export class BrokerConfig {
  [key: string]: any;
  host?: string;
  port?: number;
  login?: string;
  password?: string;

  constructor() {
    this.host = process.env.MSB_BROKER_HOST || "127.0.0.1";
    this.port = process.env.MSB_BROKER_PORT || 5672;
    this.login = process.env.MSB_BROKER_USER || "guest";
    this.password = process.env.MSB_BROKER_PASS || "guest";
  }
}

export interface ConsumerOptions {
  autoConfirm?: boolean;
}

export interface ProducerOptions {
}

export class Config {
  schema: JsonSchema;
  cleanupConsumers: boolean;
  autoMessageContext: boolean;
  brokerAdapter: adapterName;

  constructor() {
    this.schema = require("../schema");
    this.cleanupConsumers = false;
    this.autoMessageContext = true;
    this.brokerAdapter = process.env.MSB_BROKER_ADAPTER || "amqp";

    this._init();
  }

  configure(obj: Object): void {
    _.merge(this, obj);
  }

  /**
   * @todo Make private?
   */
  _init() {
    if (process.env.MSB_CONFIG_PATH) {
      const configPath = resolve(process.env.MSB_CONFIG_PATH);
      const jsonObj = require(configPath);
      delete(require.cache[configPath]);
      this.configure(jsonObj);
    }
  }
}

export function create() {
  return new Config();
}
