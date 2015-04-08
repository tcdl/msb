# msb - microservicebus

A framework with components to implement an event oriented microservices architecture.

## Installation

```
$ npm install msb --save
```

Use:

```js
var msb = require('msb');
```

See [implementation examples](examples).

## Configuration

### Programmatic Configuration

#### msb.configure(config)

Loads the config object over the existing app-wide configuration.

*Note: It is recommended that you do not change configuration after publisher/subscriber channels have been created.*

### Environment Variables

- MSB_SERVICE_NAME Overrides the default `config.serviceDetails.name`.
- MSB_SERVICE_VERSION Overrides the default `config.serviceDetails.version`.
- MSB_SERVICE_INSTANCE_ID Overrides the default `config.serviceDetails.instanceId`.
- MSB_CONFIG_PATH Loads the JSON/JS file at this path over default app-wide configuration.

## Tools

### CLI

Listens to a topic on the bus and prints JSON to stdout. By default it will also listen for response and ack topics detected on messages, and JSON is pretty-printed. For [Newline-delimited JSON](http://en.wikipedia.org/wiki/Line_Delimited_JSON) compatibility, specify `--pretty=false`.

```js
$ node_modules/msb/bin/msb -t=topic:to:listen:to
```

Options:
- **--topic** or **-t**
- **--follow** or **-f** listen for following topics, empty to disable, Default: response,ack
- **--pretty** or **-p** set to false to use as a newline-delimited json stream, Default: true

### Related Modules

- [http2bus](https://github.com/tcdl/msb-proxies) HTTP server handling the request-response cycle via the bus.
- [bus2http](https://github.com/tcdl/msb-proxies) Proxies requests picked up from the bus to HTTP services.

## API

### Class: msb.Responder

A responder enables sending of formatted acks and responses in response to each request message received on a topic/namespace.

#### responder.sendAck([timeoutMs], [responsesRemaining], cb)

- **timeoutMs** (optional) The requester should wait until at least this amount of milliseconds has passed since the request was published before ending. Default: previously set value or the default timeout on the requester.
- **responsesRemaining** (optional) A positive value increases the amount of responses the requester should wait for from this responder. A negative value reduces the amount of the responses the requester should wait for from this responder. Default: 1
- **cb** (optional) cb(err) Function that is called after transmission has completed.

#### responder.send(payload, [cb])

- **payload** An object that can be converted to JSON.
- **cb** (optional) cb(err) Function that is called after transmission has completed.

### Class: msb.Requester

An requester is a collector component that can also publish new messages on the bus.

### Class: msb.Collector

A collector is a component that listens for multiple response messages, with timeouts and number of responses determining its lifetime.

### Channel Monitor

A channel monitor sends heartbeats and listens for information on producers and consumers on remote `channelManager` instances.

```js
var channelMonitor = msb.channelMonitor;
```

#### channelMonitor.start()

Starts sending heartbeats and listening.

#### Event: 'update'

- **doc** Object
- **doc.infoByTopic** Object with topics as keys with objects as values e.g.

```js
{
  consumers: ['remoteInstanceId'],
  producers: ['remoteInstanceId'],
  consumedCount: 0,
  producedCount: 0,
  lastProducedAt: Tue Mar 31 2015 11:11:35 GMT+0100 (BST),
  lastConsumedAt: Tue Mar 31 2015 11:11:35 GMT+0100 (BST)
}
```

- **doc.serviceDetailsById** Object with instance IDs as keys with objects containing the remote `config.serviceDetails`.

#### Event: 'heartbeat'

Emitted when a new heartbeat has started.

### Channel Monitor Agent

```js
var channelMonitor = msb.channelMonitor;
```

#### channelMonitorAgent.start()

Starts publishing information about the producers and consumers created on the `channelManager`, and responds to heartbeats.

### Channel Manager

The channel manager enables re-use of channels listening/publishing per topic. It is an EventEmitter instance used as a singleton with the app-wide configuration.

```js
var channelManager = msb.channelManager;
```

#### channelManager.findOrCreateProducer(topic)

Returns a producer for this topic. Either existing or new. Corresponding `channelManager` events will be emitted for this producer.

#### channelManager.findOrCreateConsumer(topic)

Returns a consumer listening on this topic. Either existing or new. Corresponding channelManager events will be emitted for this consumer. If `config.cleanupConsumers` is set, these consumers will be removed as soon as there are no more listeners for them. If an app-wide schema exists, it will be checked for every incoming message.

#### Event: 'newProducerOnTopic'

- **topic** The name of the topic a new producer has been created for.

#### Event: 'newProducedMessage'

- **topic** The name of the topic a message has been successfully published for

#### Event: 'newConsumerOnTopic'

- **topic** The name of the topic a new producer has been created for.

#### Event: 'removedConsumerOnTopic'

- **topic** The name of the topic a new producer has been created for.

#### Event: 'newConsumedMessage'

- **topic** The name of the topic a message has been successfully published for.

### Producer

(Created using the `channelManager.findOrCreateProducer`.)

#### producer.publish(message, cb)

- **message** Either a string or an object that will be converted to JSON.
- **cb** cb(err) Function that is called after transmission has completed.

### Consumer

(Created using the `channelManager.findOrCreateConsumer`.)

#### consumer.close()

Stops listening for messages on this topic. If `config.cleanupConsumers` is set, and this consumer was created using `channelManager.findOrCreateConsumer`, it would be removed from the `channelManager`.

#### Event: 'message'

- **message** a parsed object, validated using the app-wide `config.schema`.

#### Event: 'error'

- **error** Either an error emitted by the underlying driver, or a schema validation error.
