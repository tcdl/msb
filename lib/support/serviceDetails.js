var path = require('path');
var os = require('os');
var ip = require('ip');
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
  var pathToPackage = path.resolve(process.mainModule.filename, '..', 'package.json');
  var pkg;
  try {
    pkg = require(pathToPackage);
  } catch(e) {
  }
  return pkg;
}


