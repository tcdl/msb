'use strict';
var msb = require('..');
var validateWithSchema = msb.validateWithSchema;
var Requester = msb.Requester;
var Responder = msb.Responder;

msb.channelMonitor.startBroadcasting();

var requestSchema = {};
var responseSchema = {};

Responder.createServer({
  namespace: 'test:aggregator'
})
.use(validateWithSchema.middleware(requestSchema))
.use(function(request, response, next) {
  response.responder.sendAckWithTimeout(5000);

  var requester = new Requester({
    namespace: 'test:general',
    waitForResponses: 2,
    ackTimeout: 100,
    responseTimeout: 2000
  });

  var results = [];

  requester
  .publish(request)
  .on('response', function(response) {
    validateWithSchema(responseSchema, response);
    results.push(response.body);
  })
  .on('error', next)
  .on('end', function() {
    response.writeHead(200);
    response.end({
      body: {
        results: results
      }
    });
  });
})
.use(function(err, request, response, next) {
  response.writeHead(err.statusCode || 500);
  response.end(err);
})
.listen();
