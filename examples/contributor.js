'use strict';
var msb = require('..');
var Contributor = msb.Contributor;
var i = 1001;

msb.channelMonitor.startBroadcasting();

Contributor.attachListener({
  namespace: 'test:general'
}, function(contributor) {
  contributor.message.res.body = i++;
  contributor.send();
});
