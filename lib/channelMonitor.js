'use strict';
var _ = require('lodash');
var InfoCenter = require('./infoCenter');

var channelMonitor = exports;

channelMonitor.create = function(channelManager) {
var channelMonitor = new InfoCenter({
  announceNamespace: '_channels:announce',
  heartbeatsNamespace: '_channels:heartbeat',
  heartbeatTimeoutMs: 5000, // Time to respond to heartbeat (must be < heartbeatIntervalMs)
  heartbeatIntervalMs: 10000 // Time before next heartbeat (must be > heartbeatTimeoutMs)
}, channelManager);

channelMonitor.on('heartbeat', function() {
  channelMonitor.docInProgress.infoByTopic = {};
  channelMonitor.docInProgress.serviceDetailsById = {};
});

channelMonitor.onAnnouncement = function(message) {
  var remoteServiceDetails = message.meta.serviceDetails;
  var remoteId = remoteServiceDetails.instanceId;
  var remoteInfoByTopic = message.payload.body;

  this.doc.serviceDetailsById = this.doc.serviceDetailsById || {};
  this.doc.serviceDetailsById[remoteId] = remoteServiceDetails;

  this.doc.infoByTopic = this.doc.infoByTopic || {};
  aggregateChannelInfo(this.doc.infoByTopic, remoteInfoByTopic, remoteId);

  if (this.docInProgress) {
    this.docInProgress.serviceDetailsById = this.docInProgress.serviceDetailsById || {};
    this.docInProgress.serviceDetailsById[remoteId] = remoteServiceDetails;
    this.docInProgress.infoByTopic = this.docInProgress.infoByTopic || {};
    aggregateChannelInfo(this.docInProgress.infoByTopic, remoteInfoByTopic, remoteId);
  }

  channelMonitor.emit('updated', this.doc);
};

channelMonitor.onHeartbeatResponse = function(payload, message) {
  var remoteServiceDetails = message.meta.serviceDetails;
  var remoteId = remoteServiceDetails.instanceId;

  this.docInProgress.serviceDetailsById[remoteId] = remoteServiceDetails;
  aggregateChannelInfo(this.docInProgress.infoByTopic, payload.body, remoteId, true);
};

function aggregateChannelInfo(infoByTopic, remoteInfoByTopic, remoteId, isHeartbeat) {
  for (var i in Object.keys(remoteInfoByTopic)) {
    var topic = Object.keys(remoteInfoByTopic)[i];
    var channelInfo = findOrCreateChannelInfo(infoByTopic, topic);
    var remoteChannelInfo = remoteInfoByTopic[topic];

    if (remoteChannelInfo.producers && !~channelInfo.producers.indexOf(remoteId)) {
      channelInfo.producers.push(remoteId);
    }
    channelInfo.lastProducedAt = maxDateAndString(channelInfo.lastProducedAt, remoteChannelInfo.lastProducedAt);

    if (remoteChannelInfo.consumers && !~channelInfo.consumers.indexOf(remoteId)) {
      channelInfo.consumers.push(remoteId);
    }
    channelInfo.lastConsumedAt = maxDateAndString(channelInfo.lastConsumedAt, remoteChannelInfo.lastConsumedAt);
  }
}

function findOrCreateChannelInfo(channelInfoPerTopic, topic) {
  var channelInfo = channelInfoPerTopic[topic];
  if (channelInfo) return channelInfo;

  channelInfo = channelInfoPerTopic[topic] = {
    producers: [],
    consumers: [],
    consumedCount: 0,
    producedCount: 0,
    lastProducedAt: null,
    lastConsumedAt: null
  };
  return channelInfo;
}

  return channelMonitor;
};

function maxDateAndString(defaultDate, newDateString) {
  if (!newDateString) return defaultDate;

  var newDate = new Date(newDateString);
  if (!defaultDate) return newDate;

  return new Date(Math.max(defaultDate, newDate));
}
