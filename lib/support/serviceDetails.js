var os = require('os');
var ip = require('ip');
var pkg = require('../../package');
var instanceId = require('./instanceId');

var serviceDetails = exports;

serviceDetails.instanceId = instanceId;
serviceDetails.hostname = os.hostname();
serviceDetails.ip = ip.address();
serviceDetails.pid = process.pid;
serviceDetails.lib = {
  name: pkg.name,
  version: pkg.version
};
