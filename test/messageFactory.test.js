'use strict';
/* Setup */
/*jshint camelcase: false */
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
var messageFactory = msb.messageFactory;

/* Tests */
describe('messageFactory', function() {

  describe('completeMeta()', function() {
    var meta;
    var config;

    beforeEach(function(done) {
      meta = messageFactory.createMeta({});
      config = {
        namespace: 'my:topic',
        channelManager: {},
        waitForResponses: 5,
        responseTimeout: 5000
      };
      done();
    });

    it('should add meta to the message', function(done) {

      var message = messageFactory.completeMeta({}, meta);

      expect(message.meta).exists();
      expect(message.meta).deep.equals(meta);

      done();
    });

    it('should add to to the topics', function(done) {
      var message = messageFactory.createDirectedMessage(config, {});

      expect(message.topics.to).exists();
      expect(message.topics.to).equals(config.namespace);

      done();
    });

    it('should add forward to the topics on middlewareNamespace', function(done) {
      config.middlewareNamespace = 'custom:topic';
      var message = messageFactory.createDirectedMessage(config, {});

      expect(message.topics.forward).exists();
      expect(message.topics.forward).equals(config.namespace);
      expect(message.topics.to).exists();
      expect(message.topics.to).equals(config.middlewareNamespace);

      done();
    });

    it('should not add forward to the topics without on middlewareNamespace', function(done) {
      var message = messageFactory.createDirectedMessage(config, {});

      expect(message.topics.forward).not.exists();

      done();
    });

    it('should add publishedAt date', function(done) {

      expect(meta.publishedAt).equals(null);

      var message = messageFactory.completeMeta({}, meta);

      expect(message.meta).exists();
      expect(message.meta.publishedAt instanceof Date).true();
      expect(Date.now() - message.meta.publishedAt.valueOf()).below(15);

      done();
    });
  });
});
