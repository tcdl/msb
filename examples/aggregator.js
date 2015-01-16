'use strict';
var Originator = require('../lib/originator');
var Contributor = require('../lib/contributor');

Contributor.attachListener({
  namespace: 'test.aggregator'
}, function(contrib) {
  contrib.sendAckWithTimeout(5000);

  // Create new
  var originator = new Originator({
    namespace: 'test.general',
    requiredResCount: 2
  });

  originator.message.req = contrib.message.req;
  originator.message.res = contrib.message.res;

  originator
  .publish()
  .on('contrib', function(message) {
    console.log('CONTRIB', contrib.message);
    contrib.message.res.body = contrib.message.res.body || {};
    contrib.message.res.body.results = contrib.message.res.body.results || [];
    contrib.message.res.body.results.push(message.res.body);
  })
  .on('final', function() {
    console.log('FINAL', contrib.message)
    contrib.message.res.statusCode = 200;
    contrib.send();
  });
});
