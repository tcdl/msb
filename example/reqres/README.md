# Request/Response

## Request One (1-1)

```
$ node example/util/start \
example/reqres/respondOnce \
example/reqres/requestOne
```

Output should be like this, with one response sent and received for each request:

```
->requestOne:0
->respondOnce:0:0
<-requestOne:0:0
->requestOne:1
->respondOnce:1:1
<-requestOne:1:1
->requestOne:2
->respondOnce:2:2
<-requestOne:2:2
```

_See [messages/1-1](messages/1-1)._

Load will be distributed over additional responders when using AMQP. Try adding another `respondOnce`, or even a `respondMulti`:

```
$ MSB_BROKER_ADAPTER=amqp node example/util/start \
example/reqres/respondMulti \
example/reqres/respondOnce \
example/reqres/requestOne
```

Here you can see that only one of the responses from the `respondMulti` script is returned:

```
->requestOne:0
->respondOnce:0:0
<-requestOne:0:0
->requestOne:1
->requestOne:2
->respondOnce:2:1
<-requestOne:2:1
->respondMulti:1:0:0
->requestOne:3
->respondMulti:1:0:1
->respondMulti:1:0:2
->respondMulti:3:1:0
<-requestOne:1:2
```

## Request One or More (1-n)

```
$ MSB_BROKER_ADAPTER=amqp node example/util/start \
example/reqres/respondOnce \
example/reqres/requestMulti
```

Produces one response for every request:

```
->requestMulti:0:start
->respondOnce:0:0
<-requestMulti:0:0
--requestMulti:0:end
->requestMulti:1:start
->respondOnce:1:1
<-requestMulti:1:1
--requestMulti:1:end
```

_See [messages/1-n](messages/1-n)._

And:

```
$ MSB_BROKER_ADAPTER=amqp node example/util/start \
example/reqres/respondMulti \
example/reqres/requestMulti
```

Produces 3 responses, deliberately sent 500 ms apart, with requester waiting time extended to be able to receive all of them:

```
->requestMulti:0:start
->respondMulti:0:0
<-requestMulti:0:0
->requestMulti:1:start
->respondMulti:0:1
<-requestMulti:0:1
->requestMulti:2:start
->respondMulti:1:0
<-requestMulti:1:0
->respondMulti:0:2
<-requestMulti:0:2
--requestMulti:0:end
```

## Combined

You can combine all of these to see a more complex interaction.

```
$ MSB_BROKER_ADAPTER=amqp node example/util/start \
example/reqres/respondMulti \
example/reqres/respondOnce \
example/reqres/requestMulti \
example/reqres/requestOne
```

Producing something like:

```
->requestOne:0
->requestMulti:0:start
->respondOnce:0:0
->respondOnce:0:1
<-requestMulti:0:1
<-requestOne:0:0
--requestMulti:0:end
->requestOne:1
->requestMulti:1:start
->requestOne:2
->respondOnce:2:2
->requestMulti:2:start
<-requestOne:2:2
->respondOnce:2:3
<-requestMulti:2:3
<-requestMulti:1:0
->respondMulti:1:0
->respondMulti:1:0
--requestMulti:2:end
```
