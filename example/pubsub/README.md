# Pub/Sub

## Broadcaster (x1) + Deliver to All (x2)

```
$ node example/util/start \
example/pubsub/deliverAll \
example/pubsub/deliverAll \
example/pubsub/broadcaster
```

You should get an output like this, where for every broadcast there should be two deliveries:

```
broadcaster:0
deliverAll:0
deliverAll:0
broadcaster:1
deliverAll:1
deliverAll:1
broadcaster:2
deliverAll:2
deliverAll:2
```

You can test this with more broadcasters and more consumers.

## Broadcaster (x1) + Deliver Once (x2)

```
$ MSB_BROKER_ADAPTER=amqp node \
example/util/start \
example/pubsub/deliverOnce example/pubsub/deliverOnce \
example/pubsub/broadcaster
```

You should get an output like this, where for every broadcast there should be one delivery:

```
deliverOnce:0
broadcaster:0
deliverOnce:1
broadcaster:1
deliverOnce:2
broadcaster:2
deliverOnce:3
broadcaster:3
```

You can test this with more broadcasters and more consumers.

## Broadcaster (x1) + Deliver Once Queued (x1)

```
$ MSB_BROKER_ADAPTER=amqp node example/pubsub/deliverOnceQueued
```

In a separate terminal session, start:

```
$ MSB_BROKER_ADAPTER=amqp node example/pubsub/broadcaster
```

If you now stop and start your consumer, you should see that messages that were published while it was offline should show up as soon as it connects again, e.g.

```
deliverOnceQueued:0
deliverOnceQueued:1
deliverOnceQueued:2
deliverOnceQueued:3
deliverOnceQueued:4
^C%
$ MSB_BROKER_ADAPTER=amqp node example/pubsub/deliverOnceQueued
deliverOnceQueued:5
deliverOnceQueued:6
deliverOnceQueued:7
```

Add more consumers in different terminal sessions and vary their numbers to see how messages are delivered. Note that killing a process may mean that the message has technically been delivered without having printed to screen.

## Combined

```
$ MSB_BROKER_ADAPTER=amqp node \
example/util/start \
example/pubsub/deliverAll \
example/pubsub/deliverAll \
example/pubsub/deliverOnce \
example/pubsub/deliverOnce \
example/pubsub/broadcaster
```

You should get an output like this, where for every broadcast there should be two `deliverAll` and one `deliverOnce` deliveries:

```
deliverAll:0
deliverAll:0
deliverOnce:0
broadcaster:0
deliverOnce:1
deliverAll:1
deliverAll:1
broadcaster:1
deliverAll:2
deliverAll:2
deliverOnce:2
broadcaster:2
```

In a separate terminal session, start:

```
$ MSB_BROKER_ADAPTER=amqp node example/pubsub/deliverOnceQueued
```

Try starting up additonal broadcasters and consumers in separate terminal sessions to see how it behaves with the number of services changing.

## Multi-adapter Forward

Start some consumers on AMQP:

```
$ MSB_BROKER_ADAPTER=amqp node \
example/util/start \
example/pubsub/deliverAll \
example/pubsub/deliverOnceQueued
```

Then start the broadcaster and forwarder with the default adapter, Redis:

```
$ node example/util/start \
example/pubsub/forwardOneWay \
example/pubsub/broadcaster
```

You should get an output where messages broadcasted on Redis can be received on AMQP:

```
deliverOnceQueued:0
deliverAll:0
deliverOnceQueued:1
deliverAll:1
deliverOnceQueued:2
deliverAll:2
```

When breaking the consumers and starting again, you'll see that the AMQP consumer configuration works:

```
deliverOnceQueued:27
deliverOnceQueued:28
deliverOnceQueued:29
deliverOnceQueued:30
deliverOnceQueued:31
deliverAll:31
deliverOnceQueued:32
deliverAll:32
deliverOnceQueued:33
deliverAll:33
```
