/* Setup */
var Lab = require('lab');
var Code = require('code');
var lab = exports.lab = Lab.script();

var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var beforeEach = lab.beforeEach;
var after = lab.after;
var afterEach = lab.afterEach;
var expect = Code.expect;

/* Modules */
var simple = require('simple-mock');
var mock = simple.mock;
var msb = require('..');
var Originator = msb.Originator;

/* Tests */
describe('Originator', function() {
  var mocks;

  beforeEach(function(done) {
    mocks = {};
    done();
  });

  afterEach(function(done) {
    simple.restore();
    done();
  });

  it('can be initialized', function(done) {
    mocks.messageFactory_createOriginalMessage = simple.mock(msb.messageFactory, 'createOriginalMessage');
    mocks.Originator_super_ = simple.mock(Originator, 'super_');

    var obj = new Originator({});

    expect(mocks.messageFactory_createOriginalMessage.called).to.equal(true);
    expect(mocks.Originator_super_.called).to.equal(true);
    done();
  });

  describe('publish()', function() {
    var producer;

    beforeEach(function(done) {
      producer = {};

      simple.mock(msb.channelManager, 'findOrCreateProducer', function(topic) {
        return producer;
      });

      simple.mock(producer, 'publish');

      done();
    });

    it('can emit error', function(done) {
      var errHandler = simple.mock();
      var expectedErr = new Error();
      producer.publish.callbackWith(expectedErr);

      var obj = new Originator({});

      obj
      .on('error', errHandler)
      .publish();

      expect(producer.publish.called).to.equal(true);
      expect(errHandler.called).to.equal(true);
      expect(errHandler.lastCall.args[0]).to.equal(expectedErr);

      done();
    });

    it('can emit message immediately', function(done) {
      producer.publish.callbackWith();

      var finalHandler = simple.mock();

      var obj = new Originator({
        waitForContribs: 0
      });

      obj
      .on('final', finalHandler)
      .publish();

      expect(producer.publish.called).to.equal(true);
      expect(finalHandler.called).to.equal(true);
      expect(finalHandler.lastCall.args[0]).to.equal(obj.message);

      done();
    });

    it('can start collecting contributions', function(done) {
      producer.publish.callbackWith();

      var finalHandler = simple.mock();

      var obj = new Originator({
        waitForContribs: 1
      });

      mocks.originator_shouldAcceptMessageFn = simple.mock(obj.shouldAcceptMessageFn, 'bind').returnWith('testValue');
      simple.mock(obj, 'listenForContribs').returnWith();
      simple.mock(obj, 'listenForAcks').returnWith();

      obj
      .on('final', finalHandler)
      .publish();

      expect(mocks.originator_shouldAcceptMessageFn.lastCall.args[0]).to.equal(obj);
      expect(obj.listenForContribs.lastCall.args[0]).to.equal(obj.message.topics.contrib);
      expect(obj.listenForContribs.lastCall.args[1]).to.equal('testValue');
      expect(obj.listenForAcks.lastCall.args[0]).to.equal(obj.message.topics.ack);
      expect(obj.listenForAcks.lastCall.args[1]).to.equal('testValue');
      expect(producer.publish.called).to.equal(true);
      expect(finalHandler.called).to.equal(false);

      done();
    });
  });
});
