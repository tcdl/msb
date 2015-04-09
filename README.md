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

See [implementation examples](examples) and [message format examples](examples/messages).

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

Listens to a topic on the bus and prints JSON to stdout. By default it will also listen for response and ack topics detected on messages, and JSON is pretty-printed. For [Newline-delimited JSON](http://en.wikipedia.org/wiki/Line_Delimited_JSON) compatibility, specify `-p false`.

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

A responder lets you send of formatted acks and responses in response to a request message received on a topic/namespace.

#### responder.sendAck([timeoutMs][, responsesRemaining], cb)

- **timeoutMs** (optional) The requester should wait until at least this amount of milliseconds has passed since the request was published before ending. Default: previously set value or the default timeout on the requester.
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

- **options.namespace** String Publish request message on this topic and listen on this appended by ':response' and ':ack'.
- **options.ackTimeout** Optional Milliseconds to allow for acks to increase the timeout or number of responses to expect.
- **options.responseTimeout** Optional Milliseconds before ending this request. Default: 3000.
- **options.waitForResponses** Optional Number of responses the collector expects before either ending or timing out. Default: Infinity/-1, i.e. only end on timeout. You will typically set this to 1.
- **originalMessage** Optional Object Message this request should correlate with.

#### requester.publish([payload][, cb])

- payload Object Contains typical payload.
- cb Function Callback to be called on success or error.

#### Event: 'response'

`function(payload, _message) { }`

- **payload** Object Response message payload.
- **_message** Object The full response message. In most cases it should not be needed.

#### Event: 'ack'

`function(_message) { }`

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
