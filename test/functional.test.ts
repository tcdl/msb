/* Setup */
var expect = require('chai').expect;

/* Modules */
var msb = require('..');
var simple = require('simple-mock');
var mockResponderFactory = require('msb-test-utils/mockResponderFactory');

describe('Requester/Collector', function() {
  var mockNamespace;
  var channelManager;
  var onResponseMock;
  var onErrorMock;
  var onEndMock;
  var mockResponder;
  var altMockResponder;

  before(function(done) {
    mockNamespace = 'test:functional';

    channelManager = msb.createChannelManager().configure({
      brokerAdapter: 'local'
    });

    done();
  });

  beforeEach(function(done) {
    onResponseMock = simple.mock();
    onErrorMock = simple.mock();
    onEndMock = simple.mock();

    mockResponder = mockResponderFactory.create(msb, {
      namespace: mockNamespace
    }, channelManager);

    altMockResponder = mockResponderFactory.create(msb, {
      namespace: mockNamespace
    }, channelManager);

    done();
  });

  afterEach(function(done) {
    mockResponder.end();
    altMockResponder.end();
    simple.restore();
    done();
  });

  describe('with waitForResponses:-1 (default) and waitForResponsesMs:500', function() {
    var requester;

    beforeEach(function(done) {
      requester = msb.Requester({
        namespace: mockNamespace,
        waitForResponsesMs: 500
      });

      requester.channelManager = channelManager;

      requester
      .on('response', onResponseMock)
      .on('error', onErrorMock)
      .on('end', onEndMock);

      done();
    });

    it('will end after the specified timeout', function(done) {
      requester.publish({});

      setImmediate(function() {
        expect(onEndMock.callCount).equals(0);

        setTimeout(function() {
          expect(onEndMock.callCount).equals(1);
          done();
        }, 600);
      });
    });

    it('will end after an ack-extended timeout', function(done) {
      mockResponder.respondWith([
        { type: 'ack', timeoutMs: 1000, responsesRemaining: 1 }
      ]);

      requester.publish({});

      setImmediate(function() {
        expect(onEndMock.callCount).equals(0);

        setTimeout(function() {
          expect(onEndMock.callCount).equals(0);
        }, 600);

        setTimeout(function() {
          expect(onEndMock.callCount).equals(1);
          done();
        }, 1100);
      });
    });

    it('will end after ack-configured response in ack-extended timeout', function(done) {
      mockResponder.respondWith([
        { type: 'ack', timeoutMs: 1000, responsesRemaining: 1 },
        { waitMs: 600, payload: { body: 'within' } },
        { waitMs: 50, payload: { body: 'after' } }
      ]);

      requester.publish({});

      setImmediate(function() {
        expect(onEndMock.callCount).equals(0);

        setTimeout(function() {
          expect(onEndMock.callCount).equals(0);
        }, 550);

        setTimeout(function() {
          expect(onResponseMock.callCount).equals(1);
          expect(onEndMock.callCount).equals(1);
          done();
        }, 700);
      });
    });
  });

  describe('with waitForResponses:2 and waitForResponsesMs:500', function() {
    var requester;

    beforeEach(function(done) {
      requester = msb.Requester({
        namespace: mockNamespace,
        waitForResponses: 2,
        waitForResponsesMs: 500
      });

      requester.channelManager = channelManager;

      requester
      .on('response', onResponseMock)
      .on('error', onErrorMock)
      .on('end', onEndMock);

      done();
    });

    it('will end after the specified timeout without sufficient ressponses', function(done) {
      mockResponder.respondWith([
        { payload: { body: 'within' } },
        { waitMs: 500, payload: { body: 'after' } }
      ]);

      requester.publish({});

      setImmediate(function() {
        expect(onEndMock.callCount).equals(0);

        setTimeout(function() {
          expect(onResponseMock.callCount).equals(1);
          expect(onEndMock.callCount).equals(0);
        }, 100);

        setTimeout(function() {
          expect(onResponseMock.callCount).equals(1);
          expect(onEndMock.callCount).equals(1);
          done();
        }, 600);
      });
    });

    it('will end after configured expected number of responses', function(done) {
      mockResponder.respondWith([
        { type: 'ack', responsesRemaining: 1 },
        { payload: { body: 'within' } },
        { waitMs: 200, payload: { body: 'within' } }
      ]);

      requester.publish({});

      setImmediate(function() {
        expect(onEndMock.callCount).equals(0);

        setTimeout(function() {
          expect(onResponseMock.callCount).equals(1);
          expect(onEndMock.callCount).equals(0);
        }, 100);

        setTimeout(function() {
          expect(onResponseMock.callCount).equals(2);
          expect(onEndMock.callCount).equals(1);
          done();
        }, 300);
      });
    });

    it('will end after expected ack-configured responses in ack-extended timeout', function(done) {
      mockResponder.respondWith([
        { type: 'ack', timeoutMs: 1000, responsesRemaining: 3 },
        { waitMs: 500, payload: { body: 'within' } },
        { waitMs: 50, payload: { body: 'within' } },
        { waitMs: 50, payload: { body: 'within' } },
        { waitMs: 50, payload: { body: 'after' } }
      ]);

      altMockResponder.respondWith([
        { waitMs: 50, payload: { body: 'non-acked' } }
      ]);

      requester.publish({});

      setImmediate(function() {
        expect(onEndMock.callCount).equals(0);

        setTimeout(function() {
          expect(onEndMock.callCount).equals(0);
          expect(onResponseMock.callCount).equals(1);
        }, 100);

        setTimeout(function() {
          expect(onResponseMock.callCount).equals(4);
          expect(onEndMock.callCount).equals(1);
          done();
        }, 625);
      });
    });

    it('will end after ack-configured responses within same responder\'s ack-extended timeout', function(done) {
      mockResponder.respondWith([
        { type: 'ack', timeoutMs: 1000, responsesRemaining: 1 },
        { waitMs: 600, payload: { body: 'within' } }
      ]);

      requester.publish({});

      setImmediate(function() {
        expect(onEndMock.callCount).equals(0);

        setTimeout(function() {
          expect(onResponseMock.callCount).equals(1);
          expect(onEndMock.callCount).equals(1);
          done();
        }, 625);
      });
    });
  });
});
