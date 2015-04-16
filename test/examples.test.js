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
var msb = require('..');
var simple = require('simple-mock');
var mockChannels = require('./support/mockChannels');

/* Tests */
describe('examples', function() {
  before(function(done) {
    simple.mock(msb.channelMonitorAgent, 'start').returnWith();
    simple.mock(msb.channelManager, 'createRawProducer', mockChannels.createRawProducer);
    simple.mock(msb.channelManager, 'createRawConsumer', mockChannels.createRawConsumer);
    done();
  });

  after(function(done) {
    simple.restore();
    done();
  });

  describe('responder', function() {
    var responder;
    var requester;

    before(function(done) {
      responder = require('../examples/responder');
      responder.listen();
      done();
    });

    after(function(done) {
      responder.close();
      done();
    });

    beforeEach(function(done) {
      requester = new msb.Requester({ namespace: 'test:general', ackTimeout: 100, responseTimeout: 1000 });
      done();
    });

    it('will validate the request payload', function(done) {
      requester
      .publish({
        headers: {},
        body: {}
      })
      .once('error', done)
      .once('end', function() {
        expect(requester.ackMessages).length(0);
        expect(requester.responseMessages).length(1);
        expect(requester.responseMessages[0].payload).deep.equals({
          statusCode: 422,
          body: null
        });
        done();
      });
    });

    it('can use custom error handler', function(done) {
      requester
      .publish({
        headers: {},
        body: 'error'
      })
      .once('error', done)
      .once('end', function() {
        expect(requester.ackMessages).length(0);
        expect(requester.responseMessages).length(1);
        expect(requester.responseMessages[0].payload).deep.equals({
          statusCode: 500,
          body: 'Special Message'
        });
        done();
      });
    });

    it('can return normally', function(done) {
      requester
      .publish({
        headers: {},
        body: 'okay'
      })
      .once('error', done);

      requester = new msb.Requester({ namespace: 'test:general', ackTimeout: 100, responseTimeout: 1000 });
      requester
      .publish({
        headers: {},
        body: 'okay'
      })
      .once('error', done)
      .once('end', function() {
        expect(requester.ackMessages).length(1);
        expect(requester.responseMessages).length(1);
        expect(requester.responseMessages[0].payload).deep.equals({
          statusCode: 200,
          body: 1002
        });
        done();
      });
    });
  });
});
