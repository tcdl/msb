/**
 * This broadcaster will emit 2 messages per second
 */
var msb = require('../..');
let i = 0;

function sendBroadcast() {

  let payload = {body: {i: i++}};

  // TODO: auto-complete doesn't work
  msb.publisher('test:pubsub')
    .withMessageConfig({ttl: 30000})
    .publish(payload, ()=> console.log(`broadcaster: ${i}`));
}

setInterval(sendBroadcast, 500);
