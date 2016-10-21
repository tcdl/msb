import generateId = require("./generateId");
import {hostname, networkInterfaces} from "os";
const pkg: {name: string, version: string} = require("pkginfo")(module, "name", "version");

function getIpAddress(): string {
  const interfaces = networkInterfaces();
  let ips: string[] = Object.keys(interfaces)
    .reduce((results, name) => results.concat(interfaces[name]), [])
    .filter((iface) => iface.family === "IPv4" && !iface.internal)
    .map((iface) => iface.address);
  return ips[0] ? ips[0] : "unknown";
}

let serviceHostname: string;

try {
  serviceHostname = hostname();
} catch (e) {
  serviceHostname = "unknown";
}

export = {
  hostname: serviceHostname,
  ip: getIpAddress(),
  pid: process.pid,
  name: process.env.MSB_SERVICE_NAME || pkg.name,
  version: process.env.MSB_SERVICE_VERSION || pkg.version,
  instanceId: process.env.MSB_SERVICE_INSTANCE_ID || generateId()
};
