import {expect} from "chai";
const msb = require("..");
const simple = require("simple-mock");

/* Tests */
describe('request()', function() {
  beforeEach(function(done) {
    simple.mock(msb.Requester.prototype, 'publish');
    done();
  });

  afterEach(function(done) {
    simple.restore();
    done();
  });

  describe('with only a topic', function() {

    it('calls back on end with a response', function(done) {
      var returnValue = 'rv';

      msb.Requester.prototype.publish.callFn(function() {
        return this;
      });

      var requester = msb.request('my:topic', {
        my: 'payload'
      }, function(err, responsePayload, responseMessage) {
        if (err) return done(err);

        expect(responsePayload).equals('payload');
        expect(responseMessage).equals('message');
        done();
      });

      expect(requester instanceof msb.Requester).to.be.true;
      expect(requester.timeoutMs).equals(3000);
      expect(requester.waitForResponses).equals(1);

      requester.emit('response', 'payload', 'message');
      requester.end();
    });

    it('calls back on error', function(done) {
      var returnValue = 'rv';

      msb.Requester.prototype.publish.callFn(function() {
        return this;
      });

      var requester = msb.request('my:topic', {
        my: 'payload'
      }, function(err, responsePayload, responseMessage) {

        expect(err instanceof Error).to.be.true;
        done();
      });

      expect(requester instanceof msb.Requester).to.be.true;
      expect(requester.timeoutMs).equals(3000);
      expect(requester.waitForResponses).equals(1);

      requester.emit('error', new Error());
    });
  });

  describe('with config', function() {
    var config;

    beforeEach(function(done) {
      config = {
        namespace: 'my:topic',
        responseSchema: { type: 'object' },
        channelManager: {},
        waitForResponses: 5,
        responseTimeout: 5000
      };
      done();
    });

    it('calls back on end with a response', function(done) {
      var returnValue = 'rv';

      msb.Requester.prototype.publish.callFn(function() {
        return this;
      });

      var mockPayload = {};

      var requester = msb.request(config, {
        my: 'payload'
      }, function(err, responsePayload, responseMessage) {
        if (err) return done(err);

        expect(responsePayload).equals(mockPayload);
        expect(responseMessage).equals('message');
        done();
      });

      expect(requester instanceof msb.Requester).to.be.true;
      expect(requester.channelManager).equals(config.channelManager);
      expect(requester.timeoutMs).equals(5000);
      expect(requester.waitForResponses).equals(5);

      requester.emit('response', mockPayload, 'message');
      requester.end();
    });

    it('calls back on validation error', function(done) {
      var returnValue = 'rv';

      msb.Requester.prototype.publish.callFn(function() {
        return this;
      });

      var requester = msb.request(config , {
        my: 'payload'
      }, function(err, responsePayload, responseMessage) {

        expect(err instanceof Error).to.be.true;
        done();
      });

      expect(requester instanceof msb.Requester).to.be.true;
      expect(requester.timeoutMs).equals(5000);
      expect(requester.waitForResponses).equals(5);

      requester.emit('response', 'willfail', 'message');
    });
  });
});
