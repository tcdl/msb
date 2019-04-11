//process.env.MSB_BROKER_ADAPTER = 'activemq';
var msb = require('../..');

var assert = require('chai').assert;

describe.skip('ActiveMQ integration', function () {

  var consumer;
  var producer;

  before('create consumer', function (done) {

    consumer = msb.channelManager.findOrCreateConsumer('test:activemq', {});

    consumer.onceConsuming(function () {
      console.log('consumer connected');
      done();
    });
  });

  after('connection should be closed', function (done) {
    delete process.env.MSB_BROKER_ADAPTER;

    msb.channelManager.close();
    done();
  });

  it('should publish message and receive it', function (done) {

    var payload = {mesasge: 1};
    publishTestMessage(producer, 'test:activemq', payload);

    consumer.once('message', function (message) {
      assert.deepEqual(message.payload, payload);
      done();
    });
  });

});

function publishTestMessage(producer, topic, payload, routingKey) {
  var message = msb.messageFactory
    .createBroadcastMessage({namespace: topic});
  message.topics.routingKey = routingKey;
  message.payload = payload;

  msb.channelManager.findOrCreateProducer(topic)
    .publish(message, (err) => {
      if (err) return err;
    });
}

