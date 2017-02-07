'use strict';
/**
 * This ResponderServer will respond once for every request
 */
var msb = require('../..');
var j = 0;

msb.Responder.createEmitter({
  namespace: 'example:topic'
}).on('responder', function(responder) {
  var payload = {body: null, statusCode: null};

  var z = responder.originalMessage.payload.body.doc.z;
  var i = j++;

  var body = {
    doc: {
      i: i
    }
  };

  payload.body = body;
  payload.statusCode = 200; // HTTP-compatible
  responder.send(payload);

  console.log('->respondOnce:' + z + ':' + i);
});
