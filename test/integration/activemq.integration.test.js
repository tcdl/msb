var msb = require('../..');
var RheaSubscriberAdapter = require('../../lib/adapters/activemq/subscriber').RheaSubscriberAdapter;
var simple = require('simple-mock');
var assert = require('chai').assert;

describe('ActiveMQ integration', function () {

  var channelManager = msb.createChannelManager().configure({
    brokerAdapter: 'activemq'
  });

  describe('fanout example', function () {
    var consumer1;
    var consumer2;

    var fanoutExample = 'fanout:activemq';

    before('create consumers', function (done) {
      consumer1 = channelManager.createNewConsumer(fanoutExample, {groupId: 'consumer1', autoConfirm: true});
      consumer2 = channelManager.createNewConsumer(fanoutExample, {groupId: 'consumer2', autoConfirm: false});
      done();
    });

    after('connection should be closed', function (done) {
      delete process.env.MSB_BROKER_ADAPTER;

      channelManager.close();
      done();
    });

    it('should publish message and all consumers should receive it', function (done) {

      var confirmMethod = simple.mock(RheaSubscriberAdapter.prototype,
        'confirmProcessedMessage');

      var consumer1Ready = false;
      var consumer2Ready = false;

      var payload = {mesasge: 1};

      publishTestMessage(fanoutExample, payload);

      assert.notStrictEqual(consumer1, consumer2); // to ensure that consumers are different objects

      consumer1.once('message', function (message) {
        consumer1Ready = true;
        assert.deepEqual(message.payload, payload);
        //autoConfirm here
      });

      consumer2.once('message', function (message) {
        consumer2Ready = true;
        assert.deepEqual(message.payload, payload);
        consumer2.confirmProcessedMessage(message);
      });

      setTimeout(function () {
        assert.isTrue(consumer1Ready);
        assert.isTrue(consumer2Ready);
        assert.equal(confirmMethod.callCount, 2);
        done();
      }, 100);
    });
  });

  describe('topic example', function () {
    var consumer1;
    var consumer2;

    var topicExample = 'topic:activemq';

    before('create consumers', function (done) {

      consumer1 = channelManager.createNewConsumer(topicExample, {groupId: 'consumer1', bindingKeys:'key1', autoConfirm: true});
      consumer2 = channelManager.createNewConsumer(topicExample, {groupId: 'consumer2', bindingKeys:'key2', autoConfirm: false});
      done();
    });

    after('connection should be closed', function (done) {
      delete process.env.MSB_BROKER_ADAPTER;

      channelManager.close();
      done();
    });

    it('should publish message to specific subscriber', function (done) {

      var confirmMethod = simple.mock(RheaSubscriberAdapter.prototype,
        'confirmProcessedMessage');

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
        //autoConfirm here
      });

      consumer2.once('message', function (message) {
        consumer2Ready = true;
        assert.deepEqual(message.payload, message2);
        consumer2.confirmProcessedMessage(message);
      });

      setTimeout(function () {
        assert.isTrue(consumer1Ready);
        assert.isTrue(consumer2Ready);
        assert.equal(confirmMethod.callCount, 2);
        done();
      }, 100);
    });

  });

  function publishTestMessage(topic, payload, routingKey) {
    var message = msb.messageFactory
      .createBroadcastMessage({namespace: topic});
    message.topics.routingKey = routingKey;
    message.payload = payload;

    channelManager.findOrCreateProducer(topic)
      .publish(message, function (err) {
        if (err) {
          console.log('failed to publish message',  err);
          return err;
        }
      });
  }

});



