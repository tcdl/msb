var msb = require('../..');
var RheaSubscriberAdapter = require('../../lib/adapters/activemq/subscriber').RheaSubscriberAdapter;
var simple = require('simple-mock');
var assert = require('chai').assert;

describe('ActiveMQ integration', function () {

  var channelManager = msb.createChannelManager().configure({
    brokerAdapter: 'activemq'
  });

  channelManager.on('error', error => {
    console.log(error);
  });

  describe('prefetchCount should limit number of messages processed in once', function () {

    var consumer;

    after('connection should be closed', function (done) {
      channelManager.close();
      done();
    });

    it('should process 1 message at once with default configuration', function (done) {

      var topicExample = 'prefetch:limit';

      var TOTAL_MESSAGES = 20;
      var currentParallelCalls = 0;
      var totalCalls = 0;
      var maxParallelCalls = 0;
      var confirmedMessages = 0;

      consumer = channelManager.createNewConsumer(topicExample, {
        groupId: 'consumer1',
        autoConfirm: false,
        bindingKeys: 'default',
      }); //default prefetch should be 1

      consumer.on('message', function (message) {

        currentParallelCalls++;
        totalCalls++;

        if (currentParallelCalls > maxParallelCalls) {
          maxParallelCalls = currentParallelCalls;
        }

        setTimeout(function () {
          consumer.confirmProcessedMessage(message);
          currentParallelCalls--;
          confirmedMessages++;

          if (confirmedMessages === TOTAL_MESSAGES) {
            assert.equal(maxParallelCalls, 1);
            done();
          }
        }, 10);
      });

      for (var i = 0; i < TOTAL_MESSAGES; i++) {
        publishTestMessage(topicExample, {message: i}, 'default');
      }

    });

    it('subscriber should process limited number of messages at once', function (done) {

      var fanoutExample = 'prefetch:limit';

      var TOTAL_MESSAGES = 20;
      var PREFETCH = 3;

      consumer = channelManager.createNewConsumer(fanoutExample, {
        groupId: 'consumer1',
        autoConfirm: false,
        prefetchCount: PREFETCH,
      });

      var currentParallelCalls = 0;
      var totalCalls = 0;
      var maxParallelCalls = 0;
      var confirmedMessages = 0;

      var sentMessages = [];
      var receivedMessages = [];

      consumer.on('message', function (message) {
        receivedMessages.push(message.payload);

        currentParallelCalls++;
        totalCalls++;

        if (currentParallelCalls > maxParallelCalls) {
          maxParallelCalls = currentParallelCalls;
        }

        setTimeout(function () {
          currentParallelCalls--;
          confirmedMessages++;
          consumer.confirmProcessedMessage(message);

          if (confirmedMessages === TOTAL_MESSAGES) {
            assert.equal(maxParallelCalls, PREFETCH);
            assert.deepEqual(receivedMessages, sentMessages);
            done();
          }
        }, 10);
      });

      for (var i = 0; i < TOTAL_MESSAGES; i++) {
        const message = {message: i};
        sentMessages.push(message);
        publishTestMessage(fanoutExample, message);
      }
    });
  });

  describe('fanout multiple consumers example', function () {
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

      var consumer1Received = false;
      var consumer2Received = false;

      var payload = {mesasge: 1};

      publishTestMessage(fanoutExample, payload);

      assert.notStrictEqual(consumer1, consumer2); // to ensure that consumers are different objects

      consumer1.once('message', function (message) {
        consumer1Received = true;
        assert.deepEqual(message.payload, payload);
        //autoConfirm here

        if (consumer1Received && consumer2Received) {
          done();
        }
      });

      consumer2.once('message', function (message) {
        consumer2Received = true;
        assert.deepEqual(message.payload, payload);
        consumer2.confirmProcessedMessage(message);

        if (consumer1Received && consumer2Received) {
          done();
        }
      });

    });
  });

  describe('topic multiple consumers example', function () {
    var consumer1;
    var consumer2;

    var topicExample = 'topic:activemq';

    before('create consumers', function (done) {

      consumer1 = channelManager.createNewConsumer(topicExample, {
        groupId: 'consumer1',
        bindingKeys: 'key1',
        autoConfirm: true
      });
      consumer2 = channelManager.createNewConsumer(topicExample, {
        groupId: 'consumer2',
        bindingKeys: 'key2',
        autoConfirm: false
      });
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

        if (consumer1Ready && consumer2Ready) {
          done();
        }
      });

      consumer2.once('message', function (message) {
        consumer2Ready = true;
        assert.deepEqual(message.payload, message2);
        consumer2.confirmProcessedMessage(message);

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
      .publish(message, function (err) {
        if (err) {
          console.log('failed to publish message', err);
          return err;
        }
      });
  }

});



