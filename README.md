# msb - microservicebus [![Build Status](https://travis-ci.org/tcdl/msb.svg?branch=master)](https://travis-ci.org/tcdl/msb)

A framework to implement an event oriented microservices architecture.

<!-- MarkdownTOC -->

- [Installation](#installation)
- [Configuration](#configuration)
  - [msb.configure(config)](#msbconfigureconfig)
  - [Environment Variables](#environment-variables)
- [Tools](#tools)
  - [CLI](#cli)
  - [Related Modules](#related-modules)
- [Message Brokers / Adapters](#message-brokers--adapters)
  - [Redis](#redis)
  - [AMQP / RabbitMQ](#amqp--rabbitmq)
- [API](#api)
  - [Class: msb.Responder](#class-msbresponder)
  - [Class: ResponderServer](#class-responderserver)
  - [Class: ResponderResponse](#class-responderresponse)
  - [Class: msb.Requester](#class-msbrequester)
  - [Class: msb.Collector](#class-msbcollector)
  - [Channel Monitor](#channel-monitor)
  - [Channel Monitor Agent](#channel-monitor-agent)
  - [Channel Manager](#channel-manager)
  - [Producer](#producer)
  - [Consumer](#consumer)

<!-- /MarkdownTOC -->

## Installation

```
$ npm install msb --save
```

Use:

```js
var msb = require('msb');
```

See [implementation examples](examples) and [message format examples](examples/messages).

## Configuration

### msb.configure(config)

Loads the provided config object over the existing/default app-wide configuration.

*Note: It is recommended that you do not change configuration after publisher/subscriber channels have been created.*

- `config.serviceDetails` Object included in all messages:
  - `name` String used to identify the type of service, also used as the default for the broker groupId. (Default: `name` in the package.json of the main module.)
  - `version` (Default: `version` in the package.json of the main module.)
  - `instanceId` (Default: generated universally unique 12-byte/24-char hex string.)
- `config.brokerAdapter` One of 'redis', 'amqp' or 'local' (Default: 'redis')
- `config.redis` and `config.amqp` Used to configure the broker adapter (See [lib/config.js](lib/config.js).)

### Environment Variables

- MSB_SERVICE_NAME Overrides the default `config.serviceDetails.name`.
- MSB_SERVICE_VERSION Overrides the default `config.serviceDetails.version`.
- MSB_SERVICE_INSTANCE_ID Overrides the default `config.serviceDetails.instanceId`.
- MSB_BROKER_ADAPTER Overrides the default `config.brokerAdapter`.
- MSB_BROKER_HOST and MSB_BROKER_PORT Maps to appropriate values in `config.redis` and `config.amqp` overriding defaults.
- MSB_CONFIG_PATH Loads the JSON/JS file at this path over default app-wide configuration. Similar to calling `msb.configure(config)` programmatically.

## Tools

### CLI

Listens to a topic on the bus and prints JSON to stdout. By default it will also listen for response topics detected on messages, and JSON is pretty-printed. For [Newline-delimited JSON](http://en.wikipedia.org/wiki/Line_Delimited_JSON) compatibility, specify `-p false`.

```js
$ node_modules/msb/bin/msb -t topic:to:listen:to
```

Options:
- **--topic** or **-t**
- **--follow** or **-f** listen for following topics, empty to disable (Default: response,ack)
- **--pretty** or **-p** set to false to use as a newline-delimited json stream, (Default: true)

### Related Modules

- [http2bus](https://github.com/tcdl/msb-proxies) HTTP server handling the request-response cycle via the bus.
- [bus2http](https://github.com/tcdl/msb-proxies) Proxies requests picked up from the bus to HTTP services.

## Message Brokers / Adapters

### Redis

Redis Pub/Sub is the default message broker used. Setup of Redis is practically effortless on most platforms, making it great for development. Redis Pub/Sub is limited in that all published messages will be received by all subscribers per topic. This means that services backed by Redis will not scale out horizontally, i.e. you cannot distribute the work over multiple processes.

### AMQP / RabbitMQ

The AMQP adapter is tested with RabbitMQ and it implements a limited topology for simplification. One exchange is created per topic and a queue is created for every group of similar services, configured using a groupId. This means that you can have different types of services listening on the same topic, and multiple processes of the same type of service would receive a fair distribution of messages.

Note: the AMQP driver will handle `SIGINT`, `SIGTERM` and `uncaughtException` events on `process` to ensure graceful shutdown. It will only exit if there are no other listeners registered for these events. If your application implements a listener for these events, your listener should exit, preferably within a 1-2 second timeout to allow for the AMQP driver to complete graceful shutdown.

## API

### Class: msb.Responder

A responder lets you send of formatted acks and responses in response to a request message received on a topic/namespace.

#### responder.sendAck([timeoutMs][, responsesRemaining], cb)

- **timeoutMs** (optional) The requester should wait until at least this amount of milliseconds has passed since the request was published before ending. (Default: previously set value or the default timeout on the requester.)
- **responsesRemaining** (optional) A positive value increases the amount of responses the requester should wait for from this responder. A negative value reduces the amount of the responses the requester should wait for from this responder. Default: 1
- **cb** (optional) cb(err) Function that is called after transmission has completed.

#### responder.send(payload[, cb])

- **payload** An object that can be converted to JSON.
- **cb** (optional) cb(err) Function that is called after transmission has completed.

#### responder.originalMessage

The request message this responder is responding to.

#### Responder.createServer([options])

See [ResponderServer](#new-responderserveroptions).

### Class: ResponderServer

#### new ResponderServer(options)

- **options.namespace** String topic name to listen on for requests.
- **options.responseChannelTimeoutMs** Number of milliseconds for the producer channel to be kept after the last publish. (Default: 15 * 60000/15 minutes)

(Use `msb.Responder.createServer()` to create instances.)

#### responderServer.use(fnOrArr)

- **fnOrArr** Function or Array of middleware-like functions with signature:

`function handler(request, response, next)`
- **request** The payload on the incoming message.
- **response** [ResponderResponse](#class-responderresponse) object.
- **next** Function To call if response was not fulfilled, with an error object where an error occurred.

`function errorHandler(err, request, response, next)`
- **err** Error Passed to a previous `next()` call.
- **request**, **response**, **next** as above.

### Class: ResponderResponse

Passed to [ResponderServer](#new-responderserveroptions) middelware-like functions. The interface is kept similar to core HttpServerResponse for convenience.

#### response.setHeader(name, value), response.getHeader(name), response.removeHeader(name)

See [http](https://nodejs.org/api/http.html#http_class_http_serverresponse).

#### response.writeHead(statusCode[, statusMessage][, headers])

- **statusCode** Number Corresponding HTTP status code.
- **statusMessage** String Corresponding HTTP status message.
- **headers** Object

#### response.end([body][, cb])

- **body** Optional String|Object|Buffer
- **cb** Optional Function Callback to be called when response has been successfully sent or on error.

#### response.responder

The Responder object used to send acks and responses.

### Class: msb.Requester

An requester is a collector component that can also publish new messages on the bus.

#### new Requester(options[, originalMessage])

- **options.namespace** String Publish request message on this topic and listen on this appended by ':response'.
- **options.ackTimeout** Optional Rquester will wait at least this amount of milliseconds for acks, before ending this request.
- **options.responseTimeout** Optional Milliseconds before ending this request. (Default: 3000).
- **options.waitForResponses** Optional Number of responses the collector expects before either ending or timing out. (Default: Infinity/-1, i.e. only end on timeout. You will typically set this to 1.)
- **originalMessage** Optional (Object|null) Message this request should correlate with. If `null` it will override current `messageFactory` context for correlation.

#### requester.publish([payload][, cb])

- payload Object Contains typical payload.
- cb Function Callback to be called on success or error.

#### Event: 'response'

`function(payload, _message) { }`

- **payload** Object Response message payload.
- **_message** Object The full response message. In most cases it should not be needed.

#### Event: 'ack'

`function(ack, _message) { }`

- **ack** Object Response message ack.
- **_message** Object The full ack-containing message. In most cases it should not be needed.

#### Event: 'end'

Emitted either on timeout or when the expected number of responses has been received.

### Class: msb.Collector

A collector is a component that listens for multiple response messages, with timeouts and number of responses determining its lifetime.

(For events and instantiation, see [Requester](#new-requesteroptions-originalmessage).)

### Channel Monitor

A channel monitor sends heartbeats and listens for information on producers and consumers on remote `channelManager` instances.

```js
var channelMonitor = msb.channelMonitor;
```

#### channelMonitor.start()

Starts sending heartbeats and listening.

#### Event: 'update'

`function(doc) { }`

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

#### channelManager.findOrCreateConsumer(topic[, options])

Returns a consumer listening on this topic. Either existing or new. Corresponding channelManager events will be emitted for this consumer. If `config.cleanupConsumers` is set, these consumers will be removed as soon as there are no more listeners for them. If an app-wide schema exists, it will be checked for every incoming message.

- **topic** String
- **options.groupId** String Custom group identifier for round-robin message queue.
- **options.groupId** Boolean Set to `false` for broadcast-style message queue.

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
