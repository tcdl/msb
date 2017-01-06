'use strict';
/**
 * Twice a second:
 * The requester will wait for at least one response for 1 second
 * with the waiting time extendable if acks are received within 500 ms
 */
var msb = require('../..');
var i = 0;

function sendRequest() {

  var z = i++;

  var requestPayload = {
    body: {
      doc: {
        z: z
      }
    }
  };

  var requester = new msb.Requester({
    namespace: 'example:topic',
    waitForResponses: 1,
    waitForResponsesMs: 1000, // a.k.a. responseTimeout
    waitForAcksMs: 500
  });
  requester
  .on('payload', function(payload, _fullMessage) {
    console.log('<-requestMulti:' + z + ':' + payload.body.doc.i);
  })
  .on('error', console.error)
  .on('end', function() {
    console.log('--requestMulti:' + z + ':end');
  })
  .publish(requestPayload);

  console.log('->requestMulti:' + z + ':start');
}

setInterval(sendRequest, 500);
