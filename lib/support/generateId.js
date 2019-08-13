'use strict';
var crypto = require('crypto');
var INSTANCE_ID = crypto.randomBytes(2);
var BASE_UNIX_DATE = 421000000;

var buf = new Buffer(12);
buf[4] = INSTANCE_ID[0];
buf[5] = INSTANCE_ID[1];

buf.writeUInt16BE(process.pid & 0xFFFF, 6);

module.exports = function generateId() {
  buf.writeUInt32BE((Math.floor(Date.now() / 1000) - BASE_UNIX_DATE) & 0xFFFFFFFF, 0);
  buf.writeUInt16BE(inc(), 8);
  buf.writeUInt8(Math.floor(Math.random() * 256), 10);
  buf.writeUInt8(Math.floor(Math.random() * 256), 11);
  return buf.toString('hex');
};

var maxI = 65536;
var i = maxI;
function inc() {
  i = (i - 1) || maxI;
  return maxI - i;
}
