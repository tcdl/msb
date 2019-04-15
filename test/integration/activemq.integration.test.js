var msb = require('../..');
var assert = require('chai').assert;

describe('ActiveMQ integration', function () {

  var channelManager;

  before('should delete cache', function () {
    channelManager = msb.createChannelManager().configure({
      brokerAdapter: 'activemq'
    });
  });

  describe('fanout example', function () {
    var consumer1;
    var consumer2;

    var fanoutExample = 'fanout:activemq';

    before('create consumers', function (done) {

      //todo: refactor createRawConsumer to subscribe on all events like findOrCreateConsumer
      consumer1 = channelManager.createNewConsumer(fanoutExample, {groupId: 'consumer1', autoConfirm: true});
      consumer2 = channelManager.createNewConsumer(fanoutExample, {groupId: 'consumer2', autoConfirm: true});
      done();
    });

    after('connection should be closed', function (done) {
      delete process.env.MSB_BROKER_ADAPTER;

      channelManager.close();
      done();
    });

    it('should publish message and all consumers should receive it', function (done) {

      var consumer1Ready = false;
      var consumer2Ready = false;

      var payload = {mesasge: 1};

      publishTestMessage(fanoutExample, payload);

      assert.notStrictEqual(consumer1, consumer2); // to ensure that consumers are different objects

      consumer1.once('message', function (message) {
        consumer1Ready = true;
        assert.deepEqual(message.payload, payload);

        if (consumer1Ready && consumer2Ready) {
          done();
        }
      });

      consumer2.once('message', function (message) {
        consumer2Ready = true;
        assert.deepEqual(message.payload, payload);

        if (consumer1Ready && consumer2Ready) {
          done();
        }
      });
    });
  });

  describe('topic example', function () {
    var consumer1;
    var consumer2;

    var topicExample = 'topic:activemq';

    before('create consumers', function (done) {

      consumer1 = channelManager.createNewConsumer(topicExample, {groupId: 'consumer1', bindingKeys:'key1', autoConfirm: true});
      consumer2 = channelManager.createNewConsumer(topicExample, {groupId: 'consumer2', bindingKeys:'key2', autoConfirm: true});
      done();
    });

    after('connection should be closed', function (done) {
      delete process.env.MSB_BROKER_ADAPTER;

      channelManager.close();
      done();
    });

    it('should publish message to specific subscriber', function (done) {

      var consumer1Ready = false;
      var consumer2Ready = false;

      var message1 = {mesasge: 1};
      var message2 = {mesasge: 2};

      publishTestMessage(topicExample, message1, 'key1');
      publishTestMessage(topicExample, message2, 'key2');

      assert.notStrictEqual(consumer1, consumer2); // to ensure that consumers are different objects

      consumer1.once('message', function (message) {
        consumer1Ready = true;
        assert.deepEqual(message.payload, message1);

        if (consumer1Ready && consumer2Ready) {
          done();
        }
      });

      consumer2.once('message', function (message) {
        consumer2Ready = true;
        assert.deepEqual(message.payload, message2);

        if (consumer1Ready && consumer2Ready) {
          done();
        }
      });
    });

  });

  function publishTestMessage(topic, payload, routingKey) {
    var message = msb.messageFactory
      .createBroadcastMessage({namespace: topic});
    message.topics.routingKey = routingKey;
    message.payload = payload;

    channelManager.findOrCreateProducer(topic)
      .publish(message, (err) => {
        if (err) return err;
      });
  }

});



