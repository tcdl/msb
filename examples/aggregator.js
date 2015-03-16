'use strict';
var msb = require('..');
var Requester = msb.Requester;
var Responder = msb.Responder;

msb.channelMonitor.startBroadcasting();

Responder.createServer({
  namespace: 'test:aggregator'
})
.use(function(request, response, next) {
  response.responder.sendAckWithTimeout(5000);

  // Create new
  var requester = new Requester({
    namespace: 'test:general',
    waitForResponses: 2,
    responseTimeout: 2000
  });

  var results = [];

  requester
  .publish(request)
  .on('response', function(innerResponse) {
    results.push(innerResponse.body);
  })
  .on('end', function() {
    response.writeHead(200);
    response.send({
      body: {
        results: results
      }
    });
  });
})
.listen();
