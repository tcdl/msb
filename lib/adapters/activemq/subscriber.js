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

  this._ackMap = new WeakMapFill();
  this._onMessage = this._onMessage.bind(this);
  this._ensureConsuming = this._ensureConsuming.bind(this);

  this._ensureConsuming();
  this.receiver;
}

util.inherits(RheaSubscriberAdapter, EventEmitter);

var subscriber = RheaSubscriberAdapter.prototype;

subscriber.close = function () {
  this.client.disconnect();
};


subscriber.onceConsuming = function (cb) {
  return cb();
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
  context.delivery.reject(); //sends message to queue: ActiveMQ.DLQ
  this._ackMap.delete(body);
  this.receiver.add_credit(1);
};

subscriber._onMessage = function (context) {
  var self = this;

  process.nextTick(function () {
    var parsedMessage;
    try {
      parsedMessage = JSON.parse(context.message.body);
      if (!_.isObject(parsedMessage)) throw new Error('Invalid message format');
    } catch (e) {
      self.emit('error', e);
      return;
    }

    if (!self.config.autoConfirm) {
      self._ackMap.set(parsedMessage, context);
    } else {
      self.receiver.add_credit(1);
    }

    self.emit('message', parsedMessage);
  });
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
    self._onMessage(context);
  });

  this.receiver.add_credit(credit_window);
};

exports.RheaSubscriberAdapter = RheaSubscriberAdapter;
