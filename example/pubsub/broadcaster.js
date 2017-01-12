/**
 * This broadcaster will emit 2 messages per second
 */
var msb = require('../..');
let i = 0;

function sendBroadcast() {

  let payload = {body: {i: i++}};

  msb.publisher('test:pubsub')
    .withTtl(30000)
    .publish(payload, ()=> console.log(`broadcaster: ${i}`));
}

setInterval(sendBroadcast, 500);
