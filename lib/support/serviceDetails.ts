import generateId = require("./generateId");
import {hostname, networkInterfaces} from "os";
import {resolve} from "path";
import {accessSync} from "fs";

interface PackageJson {
  [key: string]: any;
  name: string;
  version: string;
}

function getMainPackage(): PackageJson {
  const mainModuleName = require.main.paths.find((modulesPath) => {
    const pathToPackage = resolve(modulesPath, "..", "package.json");
    try {
      accessSync(pathToPackage);
    } catch (e) {
      return false;
    }
    return true;
  });

  if (mainModuleName) {
    return require(resolve(mainModuleName, "..", "package.json"));
  } else {
    return {
      name: "unknown",
      version: "unknown"
    };
  }
}

function getIpAddress(): string {
  const interfaces = networkInterfaces();
  let ips: string[] = Object.keys(interfaces)
    .reduce((results, name) => results.concat(interfaces[name]), [])
    .filter((iface) => iface.family === "IPv4" && !iface.internal)
    .map((iface) => iface.address);
  return ips[0] ? ips[0] : "unknown";
}
let mainPackage = getMainPackage();
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
  name: process.env.MSB_SERVICE_NAME || mainPackage.name,
  version: process.env.MSB_SERVICE_VERSION || mainPackage.version,
  instanceId: process.env.MSB_SERVICE_INSTANCE_ID || generateId()
};
