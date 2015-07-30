'use strict';
/**
 * Twice a second:
 * The requester will wait for at least one response for 1 second
 * with waiting time extendable if acks are received within 500 ms
 */
var msb = require('../..');
var i = 0;

function sendRequest() {
  var z = i++;

  var payload = {
    body: {
      doc: {
        z: z
      }
    }
  };

  msb.request('example:topic', payload, function(err, payload) {
    if (err) return console.error(err);
    if (!payload) return console.error('response timed out');

    console.log('<-requestOne:' + z + ':' + payload.body.doc.i);
  });

  console.log('->requestOne:' + z);
}

setInterval(sendRequest, 500);
