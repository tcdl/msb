'use strict';
var crypto = require('crypto');
var INSTANCE_ID = crypto.randomBytes(2);
var BASE_UNIX_DATE = 421000000;

var buf = new Buffer(10);
buf[4] = INSTANCE_ID[0];
buf[5] = INSTANCE_ID[1];

module.exports = function() {
  buf.writeUInt32BE(Math.floor(Date.now() / 1000) - BASE_UNIX_DATE, 0, true);
  buf.writeUInt32BE(inc(), 6, true);
  buf.writeUInt8(Math.floor(Math.random() * 256), 6);
  buf.writeUInt8(Math.floor(Math.random() * 256), 7);
  return buf.toString('hex');
};

var i = 0;
function inc() {
  i++;
  return i;
}
