'use strict';
var msb = require('../..');
var Responder = msb.Responder;
var validateWithSchema = msb.validateWithSchema;
var i = 1001;
var payloadSchema = {
  type: 'object',
  properties: {
    body: { type: 'object' }
  }
};

module.exports = Responder.createServer({
  namespace: 'test:general',
  tags: ['b']
})
// Validation middleware
.use(validateWithSchema.middleware(payloadSchema))
// Arrays of middleware
.use([
  function(request, response, next) {
    if (request.body && request.body.instruction === 'error') return next(new Error());
    next();
  },
  function(request, response, next) {
    response.responder.sendAck(1500, next); // Requester should wait at least 1.5s for response
  }
])
// Normal response
.use(function(request, response, next) {
  response.body = i++;
  response.end();
})
// Custom error handler
.use(function(err, request, response, next) {
  if (err.name === 'SchemaValidationError') return next();

  response.writeHead(500);
  response.body = 'Special Message';
  response.end();
});

if (!module.parent) module.exports.listen();
