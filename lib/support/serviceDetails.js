"use strict";
var generateId = require("./generateId");
var os_1 = require("os");
var path_1 = require("path");
var fs_1 = require("fs");
function getMainPackage() {
    var mainModuleName = require.main.paths.find(function (modulesPath) {
        var pathToPackage = path_1.resolve(modulesPath, "..", "package.json");
        try {
            fs_1.accessSync(pathToPackage);
        }
        catch (e) {
            return false;
        }
        return true;
    });
    if (mainModuleName) {
        return require(path_1.resolve(mainModuleName, "..", "package.json"));
    }
    else {
        return {
            name: "unknown",
            version: "unknown"
        };
    }
}
function getIpAddress() {
    var interfaces = os_1.networkInterfaces();
    var ips = Object.keys(interfaces)
        .reduce(function (results, name) { return results.concat(interfaces[name]); }, [])
        .filter(function (iface) { return iface.family === "IPv4" && !iface.internal; })
        .map(function (iface) { return iface.address; });
    return ips[0] ? ips[0] : "unknown";
}
var mainPackage = getMainPackage();
var serviceHostname;
try {
    serviceHostname = os_1.hostname();
}
catch (e) {
    serviceHostname = "unknown";
}
module.exports = {
    hostname: serviceHostname,
    ip: getIpAddress(),
    pid: process.pid,
    name: process.env.MSB_SERVICE_NAME || mainPackage.name,
    version: process.env.MSB_SERVICE_VERSION || mainPackage.version,
    instanceId: process.env.MSB_SERVICE_INSTANCE_ID || generateId()
};
