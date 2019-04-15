var generateDestination = require('../../../lib/adapters/activemq/utils').generateDestination;
var assert = require('chai').assert;

describe('ActiveMQ utils functions', function () {

  it('should generate destination if no routing key', function () {

    var expected = 'VirtualTopic.topic1';
    var actualDestination = generateDestination('VirtualTopic.topic1', '');

    assert.equal(actualDestination, expected);
  });

  it('should generate destination if routing key is a string', function () {

    var expected = 'VirtualTopic.topic1.key1';
    var actualDestination = generateDestination('VirtualTopic.topic1', 'key1');

    assert.equal(actualDestination, expected);
  });

  it('should generate destination if routing key is an array with single element', function () {

    var expected = 'VirtualTopic.topic1.key1';
    var actualDestination = generateDestination('VirtualTopic.topic1', ['key1']);

    assert.equal(actualDestination, expected);
  });

  it('should generate combined destination if routing key is an array', function () {

    var expected = 'VirtualTopic.topic1.key1,VirtualTopic.topic1.key2';
    var actualDestination = generateDestination('VirtualTopic.topic1', ['key1', 'key2']);

    assert.equal(actualDestination, expected);
  });

});
