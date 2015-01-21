'use strict';
var _ = require('lodash');
var debug = require('debug')('msb:channelManager');
var msb = require('../index');
var queue = require('message-queue')('redis');
var messageFactory = require('./messageFactory');
var pub = null;

var channelManager = exports;
var producersByTopic = {};
var consumersByTopic = {};
var updatingChannelInfo;

channelManager.channelInfo = {};

/** Set host and port on the config */
channelManager.config = {
  announceOnTopic: '_channels.announce',
  heartbeatsOnTopic: '_channels.heartbeat'
};

channelManager.findOrCreateProducer = function(topic) {
  var channel = producersByTopic[topic];
  if (channel) return channel;

  channel = producersByTopic[topic] = channelManager.createProducer(topic);

  channelManager.onNewChannel();
  return channel;
};

channelManager.createProducer = function(topic) {
  return (pub || createPublisher()).channel(topic);
};

// Consumer listens on a general topic
channelManager.findOrCreateConsumer = function(topic) {
  var channel = consumersByTopic[topic];
  if (channel) return channel;

  channel = consumersByTopic[topic] = channelManager.createConsumer(topic);
  channel.setMaxListeners(0);

  channelManager.onNewChannel();
  return channel;
};

channelManager.createConsumer = function(topic) {
  var config = _.merge({ channel: topic }, channelManager.config);
  return queue.Subscribe(config);
};

var announcementProducer;
var announcementConsumer;

channelManager.onNewChannel = function() {
  var announceOnTopic = channelManager.config.announceOnTopic;

  if (!announceOnTopic) return;
  if (!announcementProducer) announcementProducer = channelManager.createProducer(announceOnTopic);

  var message = messageFactory.createBaseMessage({
    namespace: announceOnTopic
  });

  message.res = {
    consumers: Object.keys(consumersByTopic),
    producers: Object.keys(producersByTopic)
  };

  messageFactory.completeMeta(message, messageFactory.createMeta());

  announcementProducer.publish(message, noop);
};

var heartbeatContributor;

channelManager.startHeartbeatContributor = function() {
  if (heartbeatContributor) return;

  heartbeatContributor = msb.Contributor.attachListener({
    namespace: channelManager.config.heartbeatsOnTopic
  }, function(contributor) {
    var message = contributor.message;

    message.res = {
      consumers: Object.keys(consumersByTopic),
      producers: Object.keys(producersByTopic)
    };

    contributor.send();
  });
};

channelManager.startMonitor = function() {
  var announceOnTopic = channelManager.config.announceOnTopic;

  if (!announceOnTopic) return;
  if (!announcementConsumer) announcementConsumer = channelManager.createConsumer(announceOnTopic);

  announcementConsumer.on('message', function(message) {
    var channelInfo = channelManager.channelInfo;

    aggregateChannelInfo(channelInfo, message.res);
    if (updatingChannelInfo) aggregateChannelInfo(updatingChannelInfo, message.res);

    debug(channelManager.channelInfo);
  });

  collectChannelInfo();
};

function collectChannelInfo() {
  updatingChannelInfo = {
    producers: [],
    consumers: []
  };

  var originator = new msb.Originator({
    namespace: channelManager.config.heartbeatsOnTopic,
    contribTimeout: 10000
  });

  originator.on('contrib', function(message) {
    aggregateChannelInfo(updatingChannelInfo, message.res);
  });

  originator.on('end', function() {
    channelManager.channelInfo = updatingChannelInfo;
    updatingChannelInfo = null;
    setTimeout(collectChannelInfo, 10000);

    debug(channelManager.channelInfo);
  });

  originator.message.res = updatingChannelInfo;
  originator.publish();
}

function aggregateChannelInfo(channelInfo, res) {
  channelInfo.producers = _.union(channelInfo.producers, res.producers).sort();
  channelInfo.consumers = _.union(channelInfo.consumers, res.consumers).sort();
}

function createPublisher() {
  pub = queue.Publish(channelManager.config);
  return pub;
}

function noop() {}
