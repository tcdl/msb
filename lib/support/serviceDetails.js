'use strict';
var path = require('path');
var os = require('os');
var ip = require('ip');
var _ = require('lodash');
var pkg = _mainPackage();
var instanceId = require('./instanceId');

var serviceDetails = exports;

serviceDetails.instanceId = instanceId;
serviceDetails.hostname = os.hostname();
serviceDetails.ip = ip.address();
serviceDetails.pid = process.pid;
serviceDetails.name = pkg && pkg.name;
serviceDetails.version = pkg && pkg.version;

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


