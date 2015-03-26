'use strict';
var path = require('path');
var os = require('os');
var ip = require('ip');
var _ = require('lodash');
var pkg = _mainPackage();
var generateId = require('./generateId');

var serviceDetails = exports;

serviceDetails.hostname = os.hostname();
serviceDetails.ip = ip.address();
serviceDetails.pid = process.pid;
serviceDetails.name = process.env.MSB_SERVICE_NAME || pkg && pkg.name;
serviceDetails.version = process.env.MSB_SERVICE_VERSION || pkg && pkg.version;
serviceDetails.instanceId = process.env.MSB_SERVICE_INSTANCE_ID || generateId();

function _mainPackage() {
  var pkg;
  _.find(process.mainModule.paths, function(modulesPath) {
    var pathToPackage = path.resolve(modulesPath, '..', 'package.json');
    try {
      pkg = require(pathToPackage);
    } catch(e) {
    }
    return pkg;
  });
  return pkg;
}



