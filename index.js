'use strict';
/**
 * e.g. `require('msb').channelManager` or `require('msb/lib/channelManager')`
 */
var debug = require('debug')('msb');

var msb = exports;

/* Default singletons */
msb.channelManager = require('./lib/channelManager').default;
msb.channelMonitor = msb.channelManager.monitor; //require('./lib/channelMonitor').create(msb.channelManager);
msb.channelMonitorAgent = msb.channelManager.monitorAgent; //require('./lib/channelMonitorAgent').create(msb.channelManager);

/* Classes and shared singletons */
msb.messageFactory = require('./lib/messageFactory');
msb.Collector = require('./lib/collector');
msb.Requester = require('./lib/requester');
msb.Responder = require('./lib/responder');
msb.request = require('./lib/request');
msb.validateWithSchema = require('./lib/validateWithSchema');
msb.serviceDetails = require('./lib/support/serviceDetails');
msb.logger = require('./lib/support/logger');

msb.configure = function(config) {
  if (msb.channelManager.hasChannels()) {
    msb.logger.warn('`msb.configure()` must be called before channels are created.')
  }
  require('./lib/config').configure(config);
};

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

