'use strict';
/*
  e.g. `require('msb').channelManager` or `require('msb/lib/channelManager')`
*/
var msb = exports;
msb.channelManager = require('./lib/channelManager');
msb.channelMonitor = require('./lib/channelMonitor');
msb.messageFactory = require('./lib/messageFactory');
msb.Collector = require('./lib/collector');
msb.Requester = msb.Originator = require('./lib/requester');
msb.Responder = msb.Contributor = require('./lib/responder');
msb.serviceDetails = require('./lib/support/serviceDetails');
msb.configure = require('lodash').merge.bind(null, require('./lib/config'));
