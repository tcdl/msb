'use strict';
var _ = require('lodash');
var channelManager = require('./channelManager');
var InfoCenter = require('./infoCenter');

var channelMonitor = module.exports = new InfoCenter({
  announceNamespace: '_channels:announce',
  heartbeatsNamespace: '_channels:heartbeat',
  heartbeatTimeoutMs: 5000, // Time to respond to heartbeat (must be < heartbeatIntervalMs)
  heartbeatIntervalMs: 10000 // Time before next heartbeat (must be > heartbeatTimeoutMs)
});

channelMonitor.onAnnouncement = function(message) {
  var remoteId = message.meta.serviceDetails.instanceId;
  var remoteInfoByTopic = message.payload.body;

  aggregateChannelInfo(this.doc, remoteInfoByTopic, remoteId);
  if (this.docInProgress) aggregateChannelInfo(this.docInProgress, remoteInfoByTopic, remoteId);

  channelMonitor.emit('updated', this.doc);
};

channelMonitor.onHeartbeatResponse = function(payload, message) {
  aggregateChannelInfo(this.docInProgress, payload.body, message.meta.serviceDetails.instanceId);
};

function aggregateChannelInfo(infoByTopic, remoteInfoByTopic, remoteId) {
  for (var i in Object.keys(remoteInfoByTopic)) {
    var topic = Object.keys(remoteInfoByTopic)[i];
    var channelInfo = findOrCreateChannelInfo(infoByTopic, topic);
    var remoteChannelInfo = remoteInfoByTopic[topic];

    if (remoteChannelInfo.producers && !~channelInfo.producers.indexOf(remoteId)) {
      channelInfo.producers.push(remoteId);
    }

    if (remoteChannelInfo.consumers && !~channelInfo.consumers.indexOf(remoteId)) {
      channelInfo.consumers.push(remoteId);
    }

    channelInfo.lastConsumedAt = maxDateAndString(channelInfo.lastConsumedAt, remoteChannelInfo.lastConsumedAt);
  }
}

function maxDateAndString(defaultDate, newDateString) {
  if (!newDateString) return defaultDate;

  var newDate = new Date(newDateString);
  if (!defaultDate) return newDate;

  return new Date(Math.max(defaultDate, newDate));
}

function findOrCreateChannelInfo(channelInfoPerTopic, topic, isLocal) {
  var channelInfo = channelInfoPerTopic[topic];
  if (channelInfo) return channelInfo;

  channelInfo = channelInfoPerTopic[topic] = {
    producers: (isLocal) ? false : [],
    consumers: (isLocal) ? false : [],
    lastConsumedAt: null
  };
  return channelInfo;
}
