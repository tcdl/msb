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

  var z = responder.originalMessage.payload.doc.i;
  var i = j++;

  var payload = {
    doc: {
      i: i
    }
  };

  responder.send(payload);

  console.log('->respondOnce:' + z + ':' + i);
});
