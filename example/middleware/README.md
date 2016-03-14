# Middleware with forward

```
$ MSB_BROKER_ADAPTER=amqp node \
example/util/start \
example/middleware/pub \
example/middleware/sub \
example/middleware/middleware
```

You should get an output like this, where for every pub there should be middleware/resend/sub:

```
pub:0
middleware:0
resend:0
sub:0
pub:1
middleware:1
resend:1
sub:1
pub:2
middleware:2
resend:2
sub:2
pub:3
middleware:3
resend:3
sub:3
```
