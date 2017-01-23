'use strict';
/**
 * This subscriber will receive all messages published
 */
const msb = require('../..');

msb.subscriber('test:pubsub:routing-key')
  .withExchangeType('topic')
  .withBindingKeys(['even'])
  .createEmitter()
  .on('message', (message) => console.log('subEven:' + message.payload.body.i))
  .on('error', console.error);
