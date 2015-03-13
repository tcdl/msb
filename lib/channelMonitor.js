'use strict';
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var messageFactory = require('./messageFactory');
var channelManager = require('./channelManager');
var Originator = require('./originator');
var Contributor = require('./contributor');

var channelMonitor = module.exports = new EventEmitter();
var announcementProducer;
var announcementConsumer;
var heartbeatContributorListener;
var doHeartbeatInterval;
var doHeartbeatOriginator;
var collectingInfoByTopic;

channelMonitor.config = {
  announceOnTopic: '_channels:announce',
  heartbeatsOnTopic: '_channels:heartbeat',
  heartbeatTimeoutMs: 5000, // Time to respond to heartbeat (must be < heartbeatIntervalMs)
  heartbeatIntervalMs: 10000, // Time before next heartbeat (must be > heartbeatTimeoutMs)
};

channelMonitor.infoByTopic = {};
channelMonitor.localInfoByTopic = {};

channelMonitor.startBroadcasting = function() {
  if (heartbeatContributorListener) return;

  heartbeatContributorListener = Contributor.attachListener({
    namespace: channelMonitor.config.heartbeatsOnTopic
  }, function(contributor) {
    contributor.message.res.body = channelMonitor.localInfoByTopic;
    contributor.send();
  });

  channelManager
  .on(channelManager.PRODUCER_NEW_TOPIC_EVENT, onChannelManagerProducerNewTopic)
  .on(channelManager.CONSUMER_NEW_TOPIC_EVENT, onChannelManagerConsumerNewTopic)
  .on(channelManager.CONSUMER_REMOVED_TOPIC_EVENT, onChannelManagerConsumerRemovedTopic)
  .on(channelManager.CONSUMER_NEW_MESSAGE_EVENT, onChannelManagerConsumerNewMessage);
};

channelMonitor.stopBroadcasting = function() {
  if (!heartbeatContributorListener) return; // Not broadcasting

  heartbeatContributorListener.end();
  heartbeatContributorListener = null;

  channelManager
  .removeListener(channelManager.PRODUCER_NEW_TOPIC_EVENT, onChannelManagerProducerNewTopic)
  .removeListener(channelManager.CONSUMER_NEW_TOPIC_EVENT, onChannelManagerConsumerNewTopic)
  .removeListener(channelManager.CONSUMER_REMOVED_TOPIC_EVENT, onChannelManagerConsumerRemovedTopic)
  .removeListener(channelManager.CONSUMER_NEW_MESSAGE_EVENT, onChannelManagerConsumerNewMessage);
};

channelMonitor.doBroadcast = _.debounce(function() {
  var announceOnTopic = channelMonitor.config.announceOnTopic;
  if (!announcementProducer) announcementProducer = channelManager.createProducer(announceOnTopic);

  var message = messageFactory.createBaseMessage({
    namespace: announceOnTopic
  });

  message.res.body = channelMonitor.localInfoByTopic;
  messageFactory.completeMeta(message, messageFactory.createMeta());
  announcementProducer.publish(JSON.stringify(message), noop);
}, 0);

channelMonitor.startMonitoring = function() {
  if (announcementConsumer) return; // Already monitoring

  var announceOnTopic = channelMonitor.config.announceOnTopic;
  announcementConsumer = channelManager.createConsumer(announceOnTopic);
  announcementConsumer.on('message', onAnnouncementMessage);

  if (!channelMonitor.config.heartbeatIntervalMs) return; // Monitor without heartbeat
  channelMonitor.doHeartbeat();
  doHeartbeatInterval = setInterval(channelMonitor.doHeartbeat, channelMonitor.config.heartbeatIntervalMs);
};

channelMonitor.stopMonitoring = function() {
  if (!announcementConsumer) return; // Not monitoring

  announcementConsumer.removeListener('message', onAnnouncementMessage);
  announcementConsumer = null;

  // Monitoring with heartbeat
  if (doHeartbeatOriginator) {
    doHeartbeatOriginator.removeListeners();
    clearInterval(doHeartbeatInterval);
  }
};

channelMonitor.doHeartbeat = function() {
  collectingInfoByTopic = {};

  channelMonitor.emit('heartbeat');
  var originator = new Originator({
    namespace: channelMonitor.config.heartbeatsOnTopic,
    contribTimeout: channelMonitor.config.heartbeatTimeoutMs
  });
  doHeartbeatOriginator = originator; // To be able to cancel

  originator.on('contrib', function(message) {
    aggregateChannelInfo(collectingInfoByTopic, message.res.body, message.meta.serviceDetails.instanceId);
  });

  originator.on('end', function() {
    channelMonitor.infoByTopic = collectingInfoByTopic;
    doHeartbeatOriginator = null;

    channelMonitor.emit('heartbeat-complete');
    channelMonitor.emit('updated', channelMonitor.infoByTopic);
  });

  originator.message.res.body = collectingInfoByTopic;
  originator.publish();
};

function onChannelManagerProducerNewTopic(topic) {
  if (topic[0] === '_') return;
  findOrCreateChannelInfo(channelMonitor.localInfoByTopic, topic, true).producers = true;
  channelMonitor.doBroadcast();
}

function onChannelManagerConsumerNewTopic(topic) {
  if (topic[0] === '_') return;
  findOrCreateChannelInfo(channelMonitor.localInfoByTopic, topic, true).consumers = true;
  channelMonitor.doBroadcast();
}

function onChannelManagerConsumerRemovedTopic(topic) {
  if (topic[0] === '_') return;
  findOrCreateChannelInfo(channelMonitor.localInfoByTopic, topic, true).consumers = false;
}

function onChannelManagerConsumerNewMessage(topic) {
  if (topic[0] === '_') return;
  findOrCreateChannelInfo(channelMonitor.localInfoByTopic, topic, true).lastConsumedAt = new Date();
}

function onAnnouncementMessage(message) {
  var remoteId = message.meta.serviceDetails.instanceId;
  var remoteInfoByTopic = message.res.body;

  aggregateChannelInfo(channelMonitor.infoByTopic, remoteInfoByTopic, remoteId);

  if (collectingInfoByTopic) {
    aggregateChannelInfo(collectingInfoByTopic, remoteInfoByTopic, remoteId);
  }
  channelMonitor.emit('updated', channelMonitor.infoByTopic);
}

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

function noop() {}
