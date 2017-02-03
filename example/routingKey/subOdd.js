'use strict';
/**
 * This subscriber will receive all messages published
 */
const msb = require('../..');

msb.subscriber('test:pubsub:routing-key')
  .withExchangeType('topic')
  .withBindingKeys(['odd'])
  .createEmitter()
  .on('message', (message) => console.log('subOdd:' + message.payload.body.i))
  .on('error', console.error);
