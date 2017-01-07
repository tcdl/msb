/**
 * This broadcaster will emit 10 messages per second
 */
var msb = require('../..');
let i = 0;

function sendBroadcast() {

  // TODO: auto-complete doesn't work
  let publisher = new msb.Publisher.Builder('test:pubsub')
    .withMessageConfig({ttl: 3000})
    .withBrokerConfig({groupId: false})
    .build();

  let payload = {body: {i: i++}};
  publisher.publish(payload, ()=> console.log(`broadcaster: ${i}`));
}

setInterval(sendBroadcast, 100);
