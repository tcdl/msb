'use strict';
/**
 * This subscriber will receive all messages published
 */

process.env.MSB_BROKER_ADAPTER = 'activemq';

/*process.env.MSB_BROKER_HOST = 'b-d0161bb0-710d-4481-a386-ae36528464b6-1.mq.us-east-2.amazonaws.com';
process.env.MSB_BROKER_PORT = '61614';
process.env.MSB_BROKER_USE_SSL = 'true';
process.env.MSB_AMQP_VHOST = '/';
process.env.MSB_BROKER_USER = 'admin1';
process.env.MSB_BROKER_PASS = 'admin1admin2';*/

var msb = require('../..');

msb
  .channelManager
  .findOrCreateConsumer('test:activemq', {groupId: 'nodeConsumer'})
  .on('message', function(message) {
    console.log('sub:' + message.payload);
  })
  .on('error', console.error);
