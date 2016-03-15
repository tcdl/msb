'use strict';
var _ = require('lodash');

function create() { 
  var env = process.env;
  var serviceDetails = {};
  
  serviceDetails.hostname = require('os').hostname();
  serviceDetails.ip = require('ip').address();
  serviceDetails.pid = process.pid;
  
  var pkg = _mainPackage();
  serviceDetails.name = env.MSB_SERVICE_NAME || pkg && pkg.name;
  serviceDetails.version = env.MSB_SERVICE_VERSION || pkg && pkg.version;
  serviceDetails.instanceId = env.MSB_SERVICE_INSTANCE_ID || require('./generateId')();
  
  return serviceDetails

  /**
  * Return the contents of package.json as an object
  * @return {Object}
  */
  /* $lab:coverage:off$ */
  function _mainPackage() {
    /* $lab:coverage:on$ */
    var pkg;
    var path = require('path');
    
    //When hosting on Windows on IIS in iisnode, process.mainModule isn't the application.
    //Instead iisnode's interceptor.js is started as main. It does a good job at hiding itself but
    //unfortunately process.mainModule isn't changed.
    //So we test if we're on iisnode. There isn't any safe way to do this, so we use hacks
    // 1. First see if we're using interceptor.js. 
    // 2. As the user may specify another interceptor we then look if we have any of iisnode's 
    //    well known env vars that _might_ be set
    var oniisnode = process.mainModule && process.mainModule.filename && process.mainModule.filename.substr(-14) === 'interceptor.js' ||
      _.any(_.keys(env), function(envName) { return envName.indexOf('IISNODE_') === 0 }) 
    
    //If we're on iisnode we can use the fact that current working directory is set to the application's
    //root, otherwise we use the paths provided by process.mainModule
    var possibleLocations = oniisnode 
      ? [path.resolve(process.cwd(), 'justNeedSomeFileToEndThePath')]
      : process.mainModule && process.mainModule.paths
    
    //Find first location with a package.json file
    _.find(possibleLocations, function(modulesPath) {
      var pathToPackage = path.resolve(modulesPath, '..', 'package.json');
      try {
        pkg = require(pathToPackage);
        return true;
      } catch (e) {
        // Intentionally left blank
      }
    });
    
    return pkg;
  }
}
module.exports = create()
module.exports._createForTest = create
