var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var serviceDetails = require('../../support/serviceDetails');
var WeakMapFill = (typeof WeakMap === 'undefined') ? require('weak-map') : WeakMap;
var generateDestination = require('./utils').generateDestination;

function RheaSubscriberAdapter(config, client) {
  this.setMaxListeners(0);
  this.config = config;
  this.client = client;
  this.isClosed = false;

  this._ackMap = new WeakMapFill();
  this._onMessage = this._onMessage.bind(this);
  this._onSelfError = this._onSelfError.bind(this);
  this._onConsumerError = this._onConsumerError.bind(this);
  this._ensureConsuming = this._ensureConsuming.bind(this);
  this._emitConsuming = this._emitConsuming.bind(this);

  this.on('error', this._onSelfError);
  this._init();
  this.receiver;
}

util.inherits(RheaSubscriberAdapter, EventEmitter);

var subscriber = RheaSubscriberAdapter.prototype;

subscriber.DURABLE_QUEUE_OPTIONS = {durable: true, autoDelete: false, passive: false};
subscriber.TRANSIENT_QUEUE_OPTIONS = {passive: false};

subscriber.close = function () {
  this.isClosed = true;
  this.client.removeListener('connect', this._ensureConsuming);
  this.client.disconnect();
};


subscriber.onceConsuming = function (cb) {
  if (this.client && this.client.connected === true) return cb();
  this.once('consuming', cb);
};

subscriber.confirmProcessedMessage = function (body, _safe) {
  if (this.config.autoConfirm) return; //confirmed on library level

  var context = this._ackMap.get(body);
  context.delivery.accept();
  this._ackMap.delete(body);
  this.receiver.add_credit(1);
};

subscriber.rejectMessage = function (body) {
  if (this.config.autoConfirm) return;

  var context = this._ackMap.get(body);
  context.delivery.reject();
  this._ackMap.delete(body);
  this.receiver.add_credit(1);
};

subscriber._init = function () {
  this._ensureConsuming();
};

subscriber._onMessage = function (body, context, receiver) {
  var self = this;

  process.nextTick(function () {
    var parsedMessage;
    try {
      parsedMessage = JSON.parse(body);
      if (!_.isObject(parsedMessage)) throw new Error('Invalid message format');
    } catch (e) {
      self.emit('error', e);
      return;
    }

    if (!self.config.autoConfirm) {
      self._ackMap.set(parsedMessage, context);
    }

    self.emit('message', parsedMessage);
    if (self.config.autoConfirm) {
      receiver.add_credit(1);
    }
  });
};

subscriber._onSelfError = function () {
  // Do nothing
};

subscriber._onConsumerError = function (err) {
  this.emit('error', err);
};

subscriber._emitConsuming = function () {
  this.emit('consuming');
};

subscriber._ensureConsuming = function () {
  var self = this;
  var config = self.config;
  var client = self.client;

  var queueSuffix = (config.groupId || serviceDetails.instanceId) + '-' + ((config.durable) ? 'd' : 't');

  var destination = generateDestination(`Consumer.${queueSuffix}.VirtualTopic.${config.channel}`, config.bindingKeys);

  var credit_window = config.prefetchCount ? config.prefetchCount : 1;

  this.receiver = client.open_receiver({source: destination, autoaccept: config.autoConfirm});

  this.receiver.on('message', function (context) {
    self._onMessage(context.message.body, context, self.receiver);
  });

  this.receiver.add_credit(credit_window);

  function done(err) {
    if (err) return self.emit('error', err);
    self._emitConsuming();
  }
};

subscriber._getQueueOptions = function () {
  if (this._queueOptions) return this._queueOptions;

  var config = this.config;
  var queueOptionsDefaults = (config.durable) ? this.DURABLE_QUEUE_OPTIONS : this.TRANSIENT_QUEUE_OPTIONS;
  var queueSuffix = '.' + (config.groupId || serviceDetails.instanceId) + '.' + ((config.durable) ? 'd' : 't');
  var queueName = config.channel + queueSuffix;

  this._queueOptions = _.defaults({
    queue: queueName,
    exclusive: !config.groupId,
    prefetchCount: config.prefetchCount
  }, queueOptionsDefaults);

  return this._queueOptions;
};

exports.RheaSubscriberAdapter = RheaSubscriberAdapter;
