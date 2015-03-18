'use strict';
var _ = require('lodash');
var channelManager = require('./channelManager');
var InfoCenterAgent = require('./infoCenterAgent');

var channelMonitorAgent = module.exports = new InfoCenterAgent({
  announceNamespace: '_channels:announce',
  heartbeatsNamespace: '_channels:heartbeat'
});

channelMonitorAgent.doBroadcast = _.debounce(channelMonitorAgent.doBroadcast, 0);

channelMonitorAgent.on('start', function() {
  channelManager
  .on(channelManager.PRODUCER_NEW_TOPIC_EVENT, onChannelManagerProducerNewTopic)
  .on(channelManager.CONSUMER_NEW_TOPIC_EVENT, onChannelManagerConsumerNewTopic)
  .on(channelManager.CONSUMER_REMOVED_TOPIC_EVENT, onChannelManagerConsumerRemovedTopic)
  .on(channelManager.CONSUMER_NEW_MESSAGE_EVENT, onChannelManagerConsumerNewMessage);
});

channelMonitorAgent.on('stop', function() {
  channelManager
  .removeListener(channelManager.PRODUCER_NEW_TOPIC_EVENT, onChannelManagerProducerNewTopic)
  .removeListener(channelManager.CONSUMER_NEW_TOPIC_EVENT, onChannelManagerConsumerNewTopic)
  .removeListener(channelManager.CONSUMER_REMOVED_TOPIC_EVENT, onChannelManagerConsumerRemovedTopic)
  .removeListener(channelManager.CONSUMER_NEW_MESSAGE_EVENT, onChannelManagerConsumerNewMessage);
});

function onChannelManagerProducerNewTopic(topic) {
  if (topic[0] === '_') return;
  findOrCreateChannelInfo(channelMonitorAgent.doc, topic, true).producers = true;
  channelMonitorAgent.doBroadcast();
}

function onChannelManagerConsumerNewTopic(topic) {
  if (topic[0] === '_') return;
  findOrCreateChannelInfo(channelMonitorAgent.doc, topic, true).consumers = true;
  channelMonitorAgent.doBroadcast();
}

function onChannelManagerConsumerRemovedTopic(topic) {
  if (topic[0] === '_') return;
  findOrCreateChannelInfo(channelMonitorAgent.doc, topic, true).consumers = false;
}

function onChannelManagerConsumerNewMessage(topic) {
  if (topic[0] === '_') return;
  findOrCreateChannelInfo(channelMonitorAgent.doc, topic, true).lastConsumedAt = new Date();
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
