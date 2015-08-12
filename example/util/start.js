'use strict';

var argv = require('minimist')(process.argv.slice(2));
var path = require('path');
var spawn = require('child_process').spawn;

argv._.forEach(function(script) {
  var scriptPath = path.resolve(script);
  var childProcess = spawn('node', [scriptPath]);

  childProcess.stdout.pipe(process.stdout);
  childProcess.stderr.pipe(process.stderr);
});
