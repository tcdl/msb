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

    beforeEach(function(done) {
      meta = messageFactory.createMeta({});

      done();
    });

    it('should add meta to the message', function(done) {

      var message = messageFactory.completeMeta({}, meta);

      expect(message.meta).exists();
      expect(message.meta).deep.equals(meta);

      done();
    });

    it('should add publishedAt date', function(done) {

      expect(meta.publishedAt).equals(null);

      var message = messageFactory.completeMeta({}, meta);

      expect(message.meta).exists();
      expect(message.meta.publishedAt instanceof Date).true();
      expect(Date.now() - message.meta.publishedAt.valueOf()).below(2);

      done();
    });
  });
});
