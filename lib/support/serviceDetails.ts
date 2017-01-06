import generateId = require("./generateId");
import {accessSync} from "fs";
import {hostname, networkInterfaces} from "os";
import {resolve} from "path";

interface PackageJson {
  [key: string]: any;
  name: string;
  version: string;
}

function getMainPackage(): PackageJson {
  let mainModuleName;
  const mainModuleNameOnError = {
    name: "unknown",
    version: "unknown",
  };

  try {
    mainModuleName = require.main.paths.find((modulesPath) => {
      const pathToPackage = resolve(modulesPath, "..", "package.json");
      try {
        accessSync(pathToPackage);
      } catch (e) {
        return false;
      }
      return true;
    });
  } catch (e) {
    return mainModuleNameOnError;
  }

  if (mainModuleName) {
    return require(resolve(mainModuleName, "..", "package.json"));
  } else {
    return mainModuleNameOnError;
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
  instanceId: process.env.MSB_SERVICE_INSTANCE_ID || generateId(),
};
