"use strict";
var generateId_1 = require("./generateId");
var os_1 = require("os");
var pkg = require("pkginfo")(module, "name", "version");
function getIpAddress() {
    var interfaces = os_1.networkInterfaces();
    var ips = Object.keys(interfaces)
        .reduce(function (results, name) { return results.concat(interfaces[name]); }, [])
        .filter(function (iface) { return iface.family === "IPv4" && !iface.internal; })
        .map(function (iface) { return iface.address; });
    return ips[0] ? ips[0] : "unknown";
}
var serviceHostname;
try {
    serviceHostname = os_1.hostname();
}
catch (e) {
    serviceHostname = "unknown";
}
exports.serviceDetails = {
    hostname: serviceHostname,
    ip: getIpAddress(),
    pid: process.pid,
    name: process.env.MSB_SERVICE_NAME || pkg.name,
    version: process.env.MSB_SERVICE_VERSION || pkg.version,
    instanceId: process.env.MSB_SERVICE_INSTANCE_ID || generateId_1.generateId()
};
