'use strict';
/**
 * This responder will ack then send 3 payloads, 1 second apart
 */
var msb = require('../..');

msb.Responder.createEmitter({
  namespace: 'example:topic'
})
.on('responder', function(responder) {

  responder.sendAck(2000, 3); // sendAck(..., cb) is also possible

  var requestPayload = responder.originalMessage.payload;
  var z = requestPayload.body.doc.z;

  function sendPayload(payload) {
    responder.send(payload, function(err) {
      if (err) return console.error(err);
      console.log('->respondMulti:' + z + ':' + payload.body.doc.i);
    });
  }

  var i = -1;
  var payload;
  var delayMs;
  while (++i < 3) {
    payload = {
      body: {
        doc: {
          i: i
        }
      }
    };
    delayMs = (i + 1) * 500;

    setTimeout(sendPayload.bind(null, payload), delayMs);
  }
});
