/* Setup */
var expect = require('chai').expect;

/* Modules */
var msb = require('..');
var simple = require('simple-mock');

/* Tests */
describe('examples', function() {
  before(function(done) {
    simple.mock(msb.logger, 'warn').returnWith();

    msb.configure({
      brokerAdapter: 'local'
    });

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
      responder = require('./examples/responder');
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
        body: 'not_object'
      })
      .once('error', done)
      .once('end', function() {
        expect(requester.ackMessages).length(0);
        expect(requester.payloadMessages).length(1);
        expect(requester.payloadMessages[0].payload).deep.equals({
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
        body: { instruction: 'error' }
      })
      .once('error', done)
      .once('end', function() {
        expect(requester.ackMessages).length(0);
        expect(requester.payloadMessages).length(1);
        expect(requester.payloadMessages[0].payload).deep.equals({
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
        body: {}
      })
      .once('error', done);

      requester = new msb.Requester({
        namespace: 'test:general',
        ackTimeout: 100,
        responseTimeout: 1000,
        tags: ['a']
      });
      requester
      .publish({
        headers: {},
        body: {}
      })
      .once('error', done)
      .once('end', function() {
        expect(requester.ackMessages).length(1);
        expect(requester.payloadMessages).length(1);
        expect(requester.payloadMessages[0].payload).deep.equals({
          statusCode: 200,
          body: 1002
        });
        expect(requester.payloadMessages[0].tags.sort()).deep.equals(['a', 'b']);
        done();
      });
    });
  });
});
