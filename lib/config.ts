import {JsonSchema} from "tv4";
import serviceDetails = require("./support/serviceDetails");
import {resolve} from "path";
const _ = require("lodash");

type adapterName = "amqp" | "local";
type amqpExchangeType = "fanout" | "topic"
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

export class Config {
  schema: JsonSchema;
  cleanupConsumers: boolean;
  autoMessageContext: boolean;
  brokerAdapter: adapterName;
  amqp: ConfigAMQP;
  local: Object;

  constructor() {
    this.schema = require("../schema");
    this.cleanupConsumers = false;
    this.autoMessageContext = true;
    this.brokerAdapter = process.env.MSB_BROKER_ADAPTER || "amqp";

    this.amqp = {
      host: process.env.MSB_BROKER_HOST || "127.0.0.1",
      port: process.env.MSB_BROKER_PORT || 5672,
      login: process.env.MSB_BROKER_USER || "guest",
      password: process.env.MSB_BROKER_PASS || "guest",
      vhost: process.env.MSB_AMQP_VHOST || "/",
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
