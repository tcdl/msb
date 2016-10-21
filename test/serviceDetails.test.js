"use strict";
var chai_1 = require("chai");
var path_1 = require("path");
var serviceDetailsModulePath = path_1.resolve(__dirname, "../lib/support/serviceDetails.js");
var simple = require("simple-mock");
describe("serviceDetails", function () {
    var serviceDetails;
    beforeEach(function (done) {
        delete (require.cache[serviceDetailsModulePath]);
        done();
    });
    it("should set serviceDetails dynamically", function (done) {
        var fakeInterfaces = { en0: [{ address: "1.2.3.4",
                    netmask: "255.255.255.0",
                    family: "IPv4",
                    mac: "60:03:08:92:27:88",
                    internal: false }] };
        simple.mock(require("os"), "networkInterfaces").returnWith(fakeInterfaces);
        simple.mock(require("pkginfo"), "name").returnWith("");
        serviceDetails = require(serviceDetailsModulePath);
        // expect(serviceDetails.hostname).equals("abchost");
        chai_1.expect(serviceDetails.ip).equals("1.2.3.4");
        chai_1.expect(serviceDetails.pid).equals(process.pid);
        chai_1.expect(serviceDetails.name).to.be.a("string");
        chai_1.expect(!!serviceDetails.version.match(/\d+\.\d+\.\d+/)).to.be.true;
        chai_1.expect(serviceDetails.instanceId).length(24);
        done();
    });
    it("should set host 'unknown' on configured incorrectly host", function (done) {
        simple.mock(require("os"), "hostname").throwWith(new Error());
        serviceDetails = require(serviceDetailsModulePath);
        chai_1.expect(serviceDetails.hostname).equals("unknown");
        chai_1.expect(serviceDetails.pid).equals(process.pid);
        chai_1.expect(serviceDetails.name).to.be.a("string");
        chai_1.expect(!!serviceDetails.version.match(/\d+\.\d+\.\d+/)).to.be.true;
        chai_1.expect(serviceDetails.instanceId).length(24);
        done();
    });
    it("should safely handle a missing package.json", function (done) {
        simple.mock(process, "mainModule", { paths: ["/tmp/etc.js"] });
        serviceDetails = require(serviceDetailsModulePath);
        chai_1.expect(serviceDetails.name).equals("unknown");
        chai_1.expect(serviceDetails.version).equals("unknown");
        chai_1.expect(serviceDetails.instanceId).length(24);
        done();
    });
    it("should handle a valid package.json", function (done) {
        simple.mock(process, "mainModule", { paths: [require("path").join(__dirname, "fixtures", "package.json")] });
        serviceDetails = require(serviceDetailsModulePath);
        chai_1.expect(serviceDetails.name).equals("example");
        chai_1.expect(serviceDetails.version).equals("1.0.0");
        chai_1.expect(serviceDetails.instanceId).length(24);
        done();
    });
    it("should handle a valid package.json without version and name fields", function (done) {
        var path = require("path").join(__dirname, "fixtures", "package.json");
        var pkg = require(path);
        simple.mock(pkg, "name", undefined);
        simple.mock(pkg, "version", undefined);
        simple.mock(process, "mainModule", { paths: [path] });
        serviceDetails = require(serviceDetailsModulePath);
        chai_1.expect(serviceDetails.name).equals(undefined);
        chai_1.expect(serviceDetails.version).equals(undefined);
        chai_1.expect(serviceDetails.instanceId).length(24);
        done();
    });
    it("should set some of serviceDetails by environment variables", function (done) {
        simple.mock(process, "mainModule", { paths: [require("path").join(__dirname, "fixtures", "package.json")] });
        simple.mock(process.env, "MSB_SERVICE_NAME", "special-name");
        simple.mock(process.env, "MSB_SERVICE_VERSION", "999");
        simple.mock(process.env, "MSB_SERVICE_INSTANCE_ID", "abc123");
        serviceDetails = require(serviceDetailsModulePath);
        chai_1.expect(serviceDetails.name).equals("special-name");
        chai_1.expect(serviceDetails.version).equals("999");
        chai_1.expect(serviceDetails.instanceId).equals("abc123");
        done();
    });
});
