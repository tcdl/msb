'use strict';
var msb = require('..');
var Responder = msb.Responder;
var validateWithSchema = msb.validateWithSchema;
var i = 1001;

msb.channelMonitorAgent.start();

module.exports = Responder.createServer({
  namespace: 'test:general'
})
.use(validateWithSchema.middleware({
  body: {
    someString: {
      type: 'string'
    }
  }
}))
.use(function(request, response, next) {
  response.ack(5000, next); // Requester should wait at least 5s for response
})
.use(function(request, response, next) {
  response.body = i++;
  response.end();
})
.use(function(err, request, response, next) {
  if (err.name === 'SchemaValidationError') return next();

  response.writeHead(500);
  response.body = 'Special Message';
  response.end();
});

if (!module.parent) module.exports.listen();
