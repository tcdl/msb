'use strict';
/**
 * e.g. `require('msb').channelManager` or `require('msb/lib/channelManager')`
 */
var debug = require('debug')('msb');

var msb = exports;

msb.createChannelManager = require('./lib/channelManager').create;
msb.channelManager = require('./lib/channelManager').default;
msb.configure = msb.channelManager.configure

msb.messageFactory = require('./lib/messageFactory');
msb.Collector = (require('./lib/collector')).Collector;
msb.Requester = (require('./lib/requester')).Requester;
msb.Responder = require('./lib/responder');
msb.request = require('./lib/request');
msb.validateWithSchema = require('./lib/validateWithSchema');
msb.serviceDetails = require('./lib/support/serviceDetails');
msb.logger = require('./lib/support/logger');

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

