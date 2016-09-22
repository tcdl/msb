# Middleware with forward

```
$ node \
example/util/start \
example/routingKey/pub \
example/routingKey/subAll \
example/routingKey/subEven \
example/routingKey/subOdd \
```

You should get an output like this, where for every pub there should be middleware/resend/sub:

```
pub:0
subAll:0
subEven:0
pub:1
subAll:1
subOdd:1
pub:2
subEven:2
subAll:2
pub:3
subAll:3
subOdd:3
pub:4
subAll:4
subEven:4
pub:5
subOdd:5
subAll:5
pub:6
subEven:6
subAll:6
```
