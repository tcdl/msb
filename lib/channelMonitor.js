var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var debug = require('debug')('msb:channelMonitor');
var messageFactory = require('./messageFactory');
var channelManager = require('./channelManager');
var Originator = require('./originator');
var Contributor = require('./contributor');

var channelMonitor = module.exports = new EventEmitter();
var announcementProducer;
var announcementConsumer;
var updatingInfoByTopic;
var heartbeatContributor;

channelMonitor.config = {
  announceOnTopic: '_channels:announce',
  heartbeatsOnTopic: '_channels:heartbeat',
  heartbeatTimeoutMs: 5000, // Time to respond to heartbeat
  heartbeatIntervalMs: 5000, // Time before next heartbeat
};

channelMonitor.infoByTopic = {};
channelMonitor.localInfoByTopic = {};

channelMonitor.startBroadcasting = function() {
  if (heartbeatContributor) return;

  heartbeatContributor = Contributor.attachListener({
    namespace: channelMonitor.config.heartbeatsOnTopic
  }, function(contributor) {
    contributor.message.res.infoByTopic = channelMonitor.localInfoByTopic;
    contributor.send();
  });

  channelManager.on(channelManager.PRODUCER_NEW_TOPIC_EVENT, function(topic) {
    findOrCreateChannelInfo(channelMonitor.localInfoByTopic, topic, true).producers = true;
    channelMonitor.broadcastChannelInfo();
  });

  channelManager.on(channelManager.CONSUMER_NEW_TOPIC_EVENT, function(topic) {
    findOrCreateChannelInfo(channelMonitor.localInfoByTopic, topic, true).consumers = true;
    channelMonitor.broadcastChannelInfo();
  });

  channelManager.on(channelManager.CONSUMER_NEW_MESSAGE_EVENT, function(topic) {
    console.log(topic);
    findOrCreateChannelInfo(channelMonitor.localInfoByTopic, topic, true).lastConsumedAt = new Date();
  });
};

channelMonitor.broadcastChannelInfo = function() {
  var announceOnTopic = channelMonitor.config.announceOnTopic;

  if (!announceOnTopic) return;
  if (!announcementProducer) announcementProducer = channelManager.createProducer(announceOnTopic);

  var message = messageFactory.createBaseMessage({
    namespace: announceOnTopic
  });

  message.res.infoByTopic = channelMonitor.localInfoByTopic;
  messageFactory.completeMeta(message, messageFactory.createMeta());

  announcementProducer.publish(message, noop);
};

channelMonitor.startMonitoring = function() {
  var announceOnTopic = channelMonitor.config.announceOnTopic;

  if (!announceOnTopic) return;
  if (!announcementConsumer) announcementConsumer = channelManager.createConsumer(announceOnTopic);

  announcementConsumer.on('message', function(message) {
    var remoteId = message.meta.serviceDetails.instanceId;
    var remoteInfoByTopic = message.res.infoByTopic;

    aggregateChannelInfo(channelMonitor.infoByTopic, remoteInfoByTopic, remoteId);

    if (updatingInfoByTopic) {
      aggregateChannelInfo(updatingInfoByTopic, remoteInfoByTopic, remoteId);
    }

    debug(JSON.stringify(sortedObject(channelMonitor.infoByTopic), null, '  '));
  });

  collectChannelInfo();
};

function collectChannelInfo() {
  updatingInfoByTopic = {};

  var originator = new Originator({
    namespace: channelMonitor.config.heartbeatsOnTopic,
    contribTimeout: channelMonitor.config.heartbeatTimeoutMs
  });

  originator.on('contrib', function(message) {
    aggregateChannelInfo(updatingInfoByTopic, message.res.infoByTopic, message.meta.serviceDetails.instanceId);
  });

  originator.on('end', function() {
    channelMonitor.infoByTopic = updatingInfoByTopic;
    updatingInfoByTopic = null;
    setTimeout(collectChannelInfo, channelMonitor.config.heartbeatIntervalMs);

    debug(JSON.stringify(sortedObject(channelMonitor.infoByTopic), null, '  '));
  });

  originator.message.res.infoByTopic = updatingInfoByTopic;
  originator.publish();
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

function sortedObject(obj) {
  var args = Object.keys(obj).sort();
  args.unshift(obj);
  return _.pick.apply(null, args);
}

function noop() {}
