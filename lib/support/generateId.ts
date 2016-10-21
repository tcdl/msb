import * as crypto from "crypto";
let INSTANCE_ID = crypto.randomBytes(2);
const BASE_UNIX_DATE = 421000000;

let buf = new Buffer(12);
buf[4] = INSTANCE_ID[0];
buf[5] = INSTANCE_ID[1];

buf.writeUInt16BE(process.pid, 6, true);

function generateId(): string {
  buf.writeUInt32BE(Math.floor(Date.now() / 1000) - BASE_UNIX_DATE, 0, true);
  buf.writeUInt16BE(inc(), 8);
  buf.writeUInt8(Math.floor(Math.random() * 256), 10);
  buf.writeUInt8(Math.floor(Math.random() * 256), 11);
  return buf.toString("hex");
}

const maxI = 65536;
let i = maxI;
function inc(): number {
  i = (i - 1) || maxI;
  return maxI - i;
}

export = generateId;
