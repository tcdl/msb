/*process.env.MSB_BROKER_ADAPTER = 'activemq';
delete require.cache[require.resolve('../..')];
var msb = require('../..');*/

var assert = require('chai').assert;

describe('ActiveMQ integration', function () {

  process.env.MSB_BROKER_ADAPTER = 'activemq';
  delete require.cache[require.resolve('../..')]; //delete msb from cache
  delete require.cache[require('../../lib/channelManager')];

  var msb = require('../..');

  describe('fanout example', function () {
    var consumer1;
    var consumer2;

    before('create consumers', function (done) {

      consumer1 = msb.channelManager.createRawConsumer('fanout:activemq', {groupId: 'consumer1'});
      consumer2 = msb.channelManager.createRawConsumer('fanout:activemq', {groupId: 'consumer2'});

      //todo: define why if tests executed via 'npm run test-no-cs'
      //todo: then 'consumer1.onceConsuming' - is not a function?

/*      consumer1.onceConsuming(function () {
        consumer2.onceConsuming(function () {
          done();
        });
      });*/

      setTimeout(done, 100);
    });

    after('connection should be closed', function (done) {
      delete process.env.MSB_BROKER_ADAPTER;

      msb.channelManager.close();
      done();
    });

    it('should publish message and all consumers should receive it', function (done) {

      var consumer1Ready = false;
      var consumer2Ready = false;

      var payload = {mesasge: 1};

      publishTestMessage('fanout:activemq', payload);

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

    before('create consumers', function (done) {

      consumer1 = msb.channelManager.createRawConsumer('topic:activemq', {groupId: 'consumer1', bindingKeys:'key1'});
      consumer2 = msb.channelManager.createRawConsumer('topic:activemq', {groupId: 'consumer2', bindingKeys:'key2'});

      //todo: the same here
      setTimeout(done, 100);
    });

    after('connection should be closed', function (done) {
      delete process.env.MSB_BROKER_ADAPTER;

      msb.channelManager.close();
      done();
    });

    it('should publish message to specific subscriber', function (done) {

      var consumer1Ready = false;
      var consumer2Ready = false;

      var payload = {mesasge: 1};

      publishTestMessage('topic:activemq', payload, 'key1');
      publishTestMessage('topic:activemq', payload, 'key2');

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

  function publishTestMessage(topic, payload, routingKey) {
    var message = msb.messageFactory
      .createBroadcastMessage({namespace: topic});
    message.topics.routingKey = routingKey;
    message.payload = payload;

    msb.channelManager.findOrCreateProducer(topic)
      .publish(message, (err) => {
        if (err) return err;
      });
  }

});



