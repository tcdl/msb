'use strict';
/**
 * This subscriber will receive all messages published
 */
const msb = require('../..');

msb.subscriber('test:pubsub:routing-key')
  .withExchangeType('topic')
  .withBindingKeys(['#'])
  .createEmitter()
  .on('message', (message) => console.log('subAll:' + message.payload.body.i))
  .on('error', console.error);
