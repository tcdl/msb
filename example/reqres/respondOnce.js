'use strict';
/**
 * This ResponderServer will respond once for every request
 */
var msb = require('../..');
var j = 0;

msb.Responder.createServer({
  namespace: 'example:topic'
})
.use(function(request, response, next) {

  var z = request.body.doc.z;
  var i = j++;

  var body = {
    doc: {
      i: i
    }
  };

  response.writeHead(200); // HTTP-compatible
  response.end(body); // To be provided in response `payload.body`

  console.log('->respondOnce:' + z + ':' + i);
})
.listen();
