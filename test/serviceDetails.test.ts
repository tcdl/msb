import {expect} from "chai";
import {resolve, join} from "path";
const serviceDetailsModulePath = resolve(__dirname, "../lib/support/serviceDetails.js");
const simple = require("simple-mock");

describe.only("serviceDetails", function() {
  let serviceDetails;

  beforeEach(function(done) {
    delete(require.cache[serviceDetailsModulePath]);
    done();
  });

  it.only("should set serviceDetails dynamically", function(done) {
    const fakeInterfaces = {en0:
      [ { address: "1.2.3.4",
          netmask: "255.255.255.0",
          family: "IPv4",
          mac: "60:03:08:92:27:88",
          internal: false } ]};
    simple.mock(require("os"), "networkInterfaces").returnWith(fakeInterfaces);
    simple.mock(require("pkginfo"), "name").returnWith("");

    serviceDetails = require(serviceDetailsModulePath);

    // expect(serviceDetails.hostname).equals("abchost");
    expect(serviceDetails.ip).equals("1.2.3.4");
    expect(serviceDetails.pid).equals(process.pid);

    expect(serviceDetails.name).to.be.a("string");
    expect(!!serviceDetails.version.match(/\d+\.\d+\.\d+/)).to.be.true;
    expect(serviceDetails.instanceId).length(24);

    done();
  });

  it.only("should set host 'unknown' on configured incorrectly host", function(done) {
    simple.mock(require("os"), "hostname").throwWith(new Error());

    serviceDetails = require(serviceDetailsModulePath);

    expect(serviceDetails.hostname).equals("unknown");
    expect(serviceDetails.pid).equals(process.pid);

    expect(serviceDetails.name).to.be.a("string");
    expect(!!serviceDetails.version.match(/\d+\.\d+\.\d+/)).to.be.true;
    expect(serviceDetails.instanceId).length(24);

    done();
  });

  it.only("should safely handle a lack of mainModule", function(done) {
    simple.mock(process, "mainModule", undefined);

    serviceDetails = require(serviceDetailsModulePath);

    expect(serviceDetails.name).equals(undefined);
    expect(serviceDetails.version).equals(undefined);
    expect(serviceDetails.instanceId).length(24);

    done();
  });

  it("should safely handle a missing package.json", function(done) {
    simple.mock(process, "mainModule", { paths: ["/tmp/etc.js"] });

    serviceDetails = require(serviceDetailsModulePath);

    expect(serviceDetails.name).equals(undefined);
    expect(serviceDetails.version).equals(undefined);
    expect(serviceDetails.instanceId).length(24);

    done();
  });

  it("should handle a valid package.json", function(done) {
    simple.mock(process, "mainModule", { paths: [require("path").join(__dirname, "fixtures", "package.json")] });

    serviceDetails = require(serviceDetailsModulePath);
    console.log(serviceDetails);

    expect(serviceDetails.name).equals("example");
    expect(serviceDetails.version).equals("1.0.0");
    expect(serviceDetails.instanceId).length(24);

    done();
  });

  it("should handle a valid package.json without version and name fields", function(done) {
    let path = require("path").join(__dirname, "fixtures", "package.json");
    let pkg = require(path);

    simple.mock(pkg, "name", undefined);
    simple.mock(pkg, "version", undefined);

    simple.mock(process, "mainModule", { paths: [path] });

    serviceDetails = require(serviceDetailsModulePath);

    expect(serviceDetails.name).equals(undefined);
    expect(serviceDetails.version).equals(undefined);
    expect(serviceDetails.instanceId).length(24);

    done();
  });

  it("should set some of serviceDetails by environment variables", function(done) {
    simple.mock(process, "mainModule", { paths: [require("path").join(__dirname, "fixtures", "package.json")] });

    simple.mock(process.env, "MSB_SERVICE_NAME", "special-name");
    simple.mock(process.env, "MSB_SERVICE_VERSION", "999");
    simple.mock(process.env, "MSB_SERVICE_INSTANCE_ID", "abc123");

    serviceDetails = require(serviceDetailsModulePath);

    expect(serviceDetails.name).equals("special-name");
    expect(serviceDetails.version).equals("999");
    expect(serviceDetails.instanceId).equals("abc123");

    done();
  });
});
