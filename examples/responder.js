'use strict';
var msb = require('..');
var Responder = msb.Responder;
var i = 1001;

msb.channelMonitor.startBroadcasting();

Responder.createServer({
  namespace: 'test:general'
})
.use(function(request, response, next) {
  response.body = i++;
  response.end();
})
.listen();
