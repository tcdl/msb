'use strict';
var _ = require('lodash');
var env = process.env;

var serviceDetails = exports;

try {
  serviceDetails.hostname = require('os').hostname();
  serviceDetails.ip = require('ip').address();
} catch(e) {
  serviceDetails.hostname = 'unknown'
}
serviceDetails.pid = process.pid;

var pkg = _mainPackage();
serviceDetails.name = env.MSB_SERVICE_NAME || pkg && pkg.name;
serviceDetails.version = env.MSB_SERVICE_VERSION || pkg && pkg.version;
serviceDetails.instanceId = env.MSB_SERVICE_INSTANCE_ID || require('./generateId')();

/**
 * Return the contents of package.json as an object
 * @return {Object}
 */
function _mainPackage() {
  var pkg;
  _.find(process.mainModule && process.mainModule.paths, function(modulesPath) {
    var pathToPackage = require('path').resolve(modulesPath, '..', 'package.json');
    try {
      pkg = require(pathToPackage);
    } catch (e) {
    }
    return pkg;
  });
  return pkg;
}
