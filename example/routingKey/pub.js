'use strict';
/**
 * This publisher will emit 2 messages per second
 */
const msb = require('../..');
let i = 0;

function sendBroadcast() {
  let j = i++;
  let payload = {body: {i: j}};

  msb.publisher('test:pubsub:routing-key')
    .withTtl(30000) // optional
    .withExchangeType('topic')
    .withRoutingKey(j % 2 ? 'odd' : 'even')
    .publish(payload, () => console.log(`pub: ${j}`));
}

setInterval(sendBroadcast, 500);
