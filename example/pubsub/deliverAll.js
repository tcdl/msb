/**
 * This subscriber will receive all messages published
 */
var msb = require('../..');

var em = msb.subscriber('test:pubsub')
  .createEmitter();

em.on('ready', console.info);
em.on('message', (message)=> console.log(`deliverAll: ${message.payload.body.i}`));
em.on('error', console.error);
