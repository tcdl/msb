'use strict';
/**
 * e.g. `require('msb').channelManager` or `require('msb/lib/channelManager')`
 */
var debug = require('debug')('msb');

var msb = exports;

msb.channelManager = require('./lib/channelManager');
msb.channelMonitor = require('./lib/channelMonitor');
msb.channelMonitorAgent = require('./lib/channelMonitorAgent');
msb.messageFactory = require('./lib/messageFactory');
msb.Collector = require('./lib/collector');
msb.Requester = require('./lib/requester');
msb.Responder = require('./lib/responder');
msb.request = require('./lib/request');
msb.validateWithSchema = require('./lib/validateWithSchema');
msb.serviceDetails = require('./lib/support/serviceDetails');
msb.configure = require('./lib/config').configure;

/**
 *  Load plugins where provided
 */
msb.plugins = {};
try {
  require('msb-newrelic');
} catch(e) {
}
try {
  require('msb-loggly');
} catch(e) {
}

