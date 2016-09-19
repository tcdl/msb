import {EventEmitter} from "events";

export let createChannelManager: msb.createChannelManager;
export let channelManager: msb.channelManager;
export let channelMonitor: msb.channelMonitor;
export let channelMonitorAgent: msb.channelMonitorAgent;
export let configure: msb.configure;
export let messageFactory: msb.messageFactory;
export let Collector: msb.Collector;
export let Requester: msb.Requester;
export let Responder: msb.Responder;
export let request: msb.request;
export let validateWithSchema: msb.validateWithSchema;
export let serviceDetails: msb.serviceDetails;
export let logger: msb.logger;

declare namespace msb {
  interface createChannelManager {
    (): channelManager;
  }

  interface channelManager {
    close: () => void;
    hasChannels: () => boolean;
    configure: (config: MSBConfig) => this;
    findOrCreateProducer: (topic: string, unusedChannelTimeoutMs?: number) => rawProducer;
    createRawProducer: (topic: string) => rawProducer;
    findOrCreateConsumer: (topic: string, options: consumerOptions) => rawConsumer;
    createRawConsumer: (topic: string, options: consumerOptions) => rawConsumer;
    monitor: channelMonitor;
    monitorAgent: channelMonitorAgent;
  }

  interface channelMonitor extends EventEmitter {
    announceNamespace: string;
    heartbeatsNamespace: string;
    heartbeatTimeoutMs: number;
    heartbeatIntervalMs: number;
    doc: Object;
    docInProgress: Object;
    channelManager: channelManager;
    start: () => void;
    doHeartbeat: () => void;
    stop: () => void;
    announcementConsumer: rawConsumer;
    heartbeatRequester: Requester;
  }

  interface channelMonitorAgent extends EventEmitter {
    announceNamespace: string;
    heartbeatsNamespace: string;
    doc: Object;
    docInProgress: Object;
    channelManager: channelManager;
    start: () => void;
    doBroadcast: () => void;
    stop: () => void;
    announcementProducer: rawProducer;
    heartbeatResponderEmitter: ResponderEventEmitter;
  }

  interface configure {
    (newConfig: MSBConfig): channelManager;
  }

  interface messageFactory {
    createBaseMessage: (config?: MessageConfig, originalMessage?: Message) => Message;
    createDirectedMessage: (config?: MessageConfig, originalMessage?: Message) => Message;
    createBroadcastMessage: (config?: MessageConfig, originalMessage?: Message) => Message;
    createRequestMessage: (config?: MessageConfig, originalMessage?: Message) => Message;
    createResponseMessage: (config: MessageConfig, originalMessage: Message, ack: MessageAck, payload?: MessagePayload) => Message;
    createAckMessage: (config: MessageConfig, originalMessage: Message, ack: MessageAck) => Message;
    createAck: (config?: MessageConfig) => MessageAck;
    createMeta: (config?: MessageConfig, originalMessage?: Message) => MessageMeta;
    completeMeta: (message?: Message, meta?: MessageMeta) => Message;
    startContext: (message?: Message) => void;
    endContext: () => void;
  }

  interface Collector extends EventEmitter {
    (config?: CollectorConfig): this;

    channelManager: channelManager;
    startedAt: Date;
    isCanceled: boolean;
    waitForAcksMs?: number;
    waitForAcksUntil?: Date;
    waitForResponsesMs?: number;
    waitForResponses?: number;
    timeoutMs: number;
    ackMessages: Message[];
    payloadMessages: Message[];
    responseChannel: rawConsumer;

    isAwaitingAcks: () => boolean;
    isAwaitingResponses: () => boolean;
    listenForResponses: (topic: string, shouldAcceptMessageFn?: (message: Message) => boolean) => this;
    removeListeners: () => void;
    cancel: () => void;
    end: () => void;
    enableTimeout: () => this;
  }

  interface Requester extends Collector {
    (config?: CollectorConfig, originalMessage?: Message): this;

    meta: MessageMeta;
    message: Message;
    originalMessage: Message;
    requestChannelTimeoutMs: number;

    publish(payload?: MessagePayload, cb?: (err?: Error) => void): this;
  }

  interface Responder {
    (config: CollectorConfig, originalMessage: Message): this;

    channelManager: channelManager;
    config: CollectorConfig;
    meta: MessageMeta;
    ack: MessageAck;
    originalMessage: Message;
    responseChannelTimeoutMs: number;

    sendAck: (timeoutMs?: number, responsesRemaining?: number, cb?: () => void) => void;
    send: (payload: MessagePayload, cb?: ()=>void) => void;
    createEmitter: (config: ResponderConfig,
                    channelManager?: channelManager) => ResponderEventEmitter;
    createServer: (config: ResponderConfig) => ResponderServer;
  }

  interface request {
    (options: string | {
      namespace: string;
      waitForResponses?: number;
      channelManager?: channelManager;
      originalMessage?: Message;
      responseSchema?: JsonSchema;
    }, payload: MessagePayload, cb?: ()=>void): Requester;
  }

  interface validateWithSchema {
    (schema: JsonSchema, message: Object): void;
    middleware: (schema: JsonSchema) => Handler;
    onEvent: (schema: JsonSchema,
              successHandlerFn: (message: Object) => void,
              errorHandlerFn?: (e: Error, message: string) => void) => (message: Object) => void;
  }

  interface serviceDetails {
    hostname: string;
    ip?: string;
    pid: number;
    name: string;
    version: string;
    instanceId: string;
  }

  interface logger {
    warn: (info: any) => void;
  }

  /**
   * Copy past from tv4
   */
  interface JsonSchema {
    [key: string]: any;
    title?: string;          // used for humans only, and not used for computation
    description?: string;    // used for humans only, and not used for computation
    id?: string;
    $schema?: string;
    type?: string;
    items?: any;
    properties?: any;
    patternProperties?: any;
    additionalProperties?: boolean;
    required?: string[];
    definitions?: any;
    default?: any;
  }

  interface MSBConfig {
    schema?: JsonSchema;
    cleanupConsumers?: boolean;
    autoMessageContext?: boolean;
    brokerAdapter?: brokerAdapters;
    amqp?: ConfigAMQP;
    local?: Object;

  }

  type brokerAdapters = "amqp" | "local";

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
  }


  interface rawProducer {
    channel: (topic: string) => {
      publish: (payload: MessagePayload, cb?: () => void) => void;
      close: () => void;
    };
  }

  interface rawConsumer extends EventEmitter {
    close: () => void;
  }

  interface consumerOptions extends ConfigAMQP {
  }

  interface MessageConfig {
    tags?: string[];
    middlewareNamespace?: string;
    namespace: string;
  }
  interface Message {
    id: string;
    correlationId: string;
    tags: string[];
    topics: {
      forward?: string;
      to: string;
      response?: string;
    };
    meta?: MessageMeta;
    ack?: MessageAck;
    payload?: MessagePayload;
  }

  interface MessagePayload {
    [key: string]: any;
    statusCode?: number;
    method?: string;
    headers?: any;
    body?: any;
  }

  interface MessageMeta {
    serviceDetails: serviceDetails;
    ttl?: number;
    publishedAt?: Date;
    createdAt: Date;
    durationMs?: number;
  }

  interface MessageAck {
    responderId: string;
    responsesRemaining?: number;
    timeoutMs?: number;
  }

  interface CollectorConfig extends MessageConfig {
    waitForAcksMs?: number;
    waitForResponsesMs?: number;
    waitForResponses?: number;
    requestChannelTimeoutMs?: number;
    responseChannelTimeoutMs?: number;
  }

  interface ResponderEventEmitter {
    end: () => void;
  }

  interface ResponderConfig {
    namespace: string;
    groupId?: string;
    prefetchCount?: number;
    autoConfirm?: boolean;
  }

  interface ResponderServer {
    new (config: ResponderConfig): this;

    config: ResponderConfig;
    emitter: ResponderEventEmitter;

    use: (middleware: Handler) => this;
    listen: (channelManager: channelManager) => this;
    close: () => void;
  }

  interface Handler {
    (req: Object, res: Object, next?: Function): any;
  }
}
