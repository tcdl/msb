var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var serviceDetails = require('../../support/serviceDetails');

function AMQPSubscriber(config, connection) {
  this.setMaxListeners(0);
  this.config = config;
  this.connection = connection;
  this.isClosed = false;

  this._onMessage = this._onMessage.bind(this);
  this._onSelfError = this._onSelfError.bind(this);
  this._onConsumerError = this._onConsumerError.bind(this);
  this._ensureConsuming = this._ensureConsuming.bind(this);
  this._emitConsuming = this._emitConsuming.bind(this);

  this.on('error', this._onSelfError);
  this._init();
}
util.inherits(AMQPSubscriber, EventEmitter);

var subscriber = AMQPSubscriber.prototype;

subscriber.DURABLE_QUEUE_OPTIONS = { durable: true, autoDelete: false, passive: false };
subscriber.TRANSIENT_QUEUE_OPTIONS = { passive: false };

subscriber.close = function() {
  this.isClosed = true;
  this.connection.removeListener('ready', this._ensureConsuming);
  if (this.consumer) this.consumer.close();
};

subscriber.onceConsuming = function(cb) {
  if (this.consumer && this.consumer.consumerState === 'open') return cb();
  this.once('consuming', cb);
};

subscriber._init = function() {
  this.connection.on('ready', this._ensureConsuming);
  this._ensureConsuming();
};

subscriber._onMessage = function(envelope) {
  var self = this;
  var message = envelope.data.toString();

  process.nextTick(function() {
    var parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (e) {
      self.emit('error', e);
      return;
    }
    self.emit('message', parsedMessage);
  });
};

subscriber._onSelfError = function() {
  // Do nothing
};

subscriber._onConsumerError = function(err) {
  this.emit('error', err);
};

subscriber._emitConsuming = function() {
  this.emit('consuming');
};

subscriber._ensureConsuming = function() {
  var self = this;
  var config = self.config;
  var connection = self.connection;
  var consumer = self.consumer;

  var exchange = connection.exchange({ exchange: config.channel, type: 'fanout' });

  exchange.declare(function(err) {
    if (err) return self.emit('error', err);

    var queueOptions = self._getQueueOptions();
    var queue = connection.queue(queueOptions);

    queue.declare(queueOptions, function(err) {
      if (err) return self.emit('error', err);

      queue.bind(config.channel, '', function(err) {
        if (err) return self.emit('error', err);
        if (self.isClosed) return; // Skip if already closed

        if (consumer) {
          consumer.resume(self._emitConsuming);
        } else {
          consumer = self.consumer = connection.consume(queueOptions.queue, queueOptions, self._onMessage, self._emitConsuming);
          consumer.on('error', self._onConsumerError);
        }
      });
    });
  });
};

subscriber._getQueueOptions = function() {
  if (this._queueOptions) return this._queueOptions;

  var config = this.config;
  var queueOptionsDefaults = (config.durable) ? this.DURABLE_QUEUE_OPTIONS : this.TRANSIENT_QUEUE_OPTIONS;
  var queueSuffix = '.' + (config.groupId || serviceDetails.instanceId) + '.' + ((config.durable) ? 'd' : 't');
  var queueName = config.channel + queueSuffix;

  this._queueOptions = _.defaults({
    queue: queueName,
    exclusive: !config.groupId
  }, queueOptionsDefaults);

  return this._queueOptions;
};

exports.AMQPSubscriber = AMQPSubscriber;
