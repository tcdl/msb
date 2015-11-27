'use strict';
var util = require('util');
var assert = require('assert');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var Requester = require('./requester');
var Responder = require('./responder');

function InfoCenter(config, channelManager) {
  assert(channelManager);

  this.doc = {};
  this.docInProgress = {};
  this.channelManager = channelManager;

  this.announceNamespace = config.announceNamespace;
  this.heartbeatsNamespace = config.heartbeatsNamespace;
  this.heartbeatTimeoutMs = config.heartbeatTimeoutMs;
  this.heartbeatIntervalMs = config.heartbeatIntervalMs;

  this.announcementConsumer = null;
  this.heartbeatRequester = null;

  // Bind for events
  this.doHeartbeat = this.doHeartbeat.bind(this);
  this._onAnnouncement = this._onAnnouncement.bind(this);
  this._onHeartbeatResponse = this._onHeartbeatResponse.bind(this);
  this._onHeartbeatEnd = this._onHeartbeatEnd.bind(this);
}

util.inherits(InfoCenter, EventEmitter);

var infoCenter = InfoCenter.prototype;

// Override this
infoCenter.onAnnouncement = function(message) {
  _.merge(this.docInProgress, message.payload.body);
  _.merge(this.doc, message.payload.body);
  this.emit('updated', this.doc);
};

// Override this
infoCenter.onHeartbeatResponse = function(payload, message) {
  _.merge(this.docInProgress, payload.body);
};

// Override this
infoCenter.onHeartbeatEnd = function() {
  this.doc = this.docInProgress;
  this.docInProgress = null;
  this.emit('updated', this.doc);
};

infoCenter.start = infoCenter.startMonitoring = function() {
  if (this.announcementConsumer) return; // Already monitoring

  this.announcementConsumer = this.channelManager.createRawConsumer(this.announceNamespace, {
    prefetchCount: 0,
    autoConfirm: false,
    groupId: false
  });
  this.announcementConsumer.on('message', this._onAnnouncement);

  if (!this.heartbeatIntervalMs) return this.emit('start'); // Monitor without heartbeat;
  this.doHeartbeat();
  this.doHeartbeatInterval = setInterval(this.doHeartbeat, this.heartbeatIntervalMs);
  this.emit('start');
};

infoCenter.stop = infoCenter.stopMonitoring = function() {
  if (!this.announcementConsumer) return; // Not monitoring

  this.announcementConsumer.removeListener('message', this._onAnnouncement);
  this.announcementConsumer = null;

  if (this.doHeartbeatRequester) {
    clearInterval(this.doHeartbeatInterval);
    this.doHeartbeatRequester.cancel();
    this.doHeartbeatRequester = null;
    this.docInProgress = null;
  }
  this.emit('stop');
};

infoCenter.doHeartbeat = function() {
  if (this.doHeartbeatRequester) return; // Already in progress

  this.docInProgress = {};
  this.emit('heartbeat');

  var requester = this.doHeartbeatRequester = new Requester({
    namespace: this.heartbeatsNamespace,
    responseTimeout: this.heartbeatTimeoutMs
  });

  requester.on('response', this._onHeartbeatResponse);
  requester.on('end', this._onHeartbeatEnd);
  requester.on('error', this._onHeartbeatEnd);
  requester.publish();
};

infoCenter._onAnnouncement = function(message) {
  this.onAnnouncement(message);
};

infoCenter._onHeartbeatResponse = function(payload, message) {
  this.onHeartbeatResponse(payload, message);
};

infoCenter._onHeartbeatEnd = function() {
  this.onHeartbeatEnd();
  this.doHeartbeatRequester = null;
};

module.exports = InfoCenter;
