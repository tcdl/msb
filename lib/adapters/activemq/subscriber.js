var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var serviceDetails = require('../../support/serviceDetails');
var WeakMapFill = (typeof WeakMap === 'undefined') ? require('weak-map') : WeakMap;

function STOMPSubscriberAdapter(config, client) {
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
}
util.inherits(STOMPSubscriberAdapter, EventEmitter);

var subscriber = STOMPSubscriberAdapter.prototype;

subscriber.DURABLE_QUEUE_OPTIONS = { durable: true, autoDelete: false, passive: false };
subscriber.TRANSIENT_QUEUE_OPTIONS = { passive: false };

subscriber.close = function() {
  this.isClosed = true;
  this.client.removeListener('connect', this._ensureConsuming);
  // if (this.consumer) this.consumer.close();
  this.client.disconnect();
};


subscriber.onceConsuming = function(cb) {
  if (this.client && this.client.connected === true) return cb();
  this.once('consuming', cb);
};

subscriber.confirmProcessedMessage = function(message, _safe) {
  var envelope = this._ackMap.get(message);
  // Only use _safe if you can't know whether message has already been confirmed/rejected
  if (_safe && !envelope) return;
  envelope.ack(); // Will fail if `!config.prefetchCount`
  this._ackMap.delete(message);
};

subscriber.rejectMessage = function(message) {
  var envelope = this._ackMap.get(message);
  envelope.reject(); // Will fail if `!config.prefetchCount`
  this._ackMap.delete(message);
};

subscriber._init = function() {
  this.client.on('connect', this._ensureConsuming);
  if (this.client.connected) this._ensureConsuming();
};

subscriber._onMessage = function(message) {
  var self = this;
  // var message = envelope.data.toString();

  process.nextTick(function() {
    var parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
      if (!_.isObject(parsedMessage)) throw new Error('Invalid message format');
    } catch (e) {
      // envelope.reject();
      self.emit('error', e);
      return;
    }
    // if (self.config.prefetchCount) self._ackMap.set(parsedMessage, envelope);
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
  var client = self.client;
  var consumer = self.consumer;

  var queueSuffix = (config.groupId || serviceDetails.instanceId) + '-' + ((config.durable) ? 'd' : 't');

  //todo: add binding keys
  var bindingKeys = !config.bindingKeys ? [''] :
    _.isString(config.bindingKeys) ? [config.bindingKeys] : config.bindingKeys;

  console.log('config.channel: ' + config.channel);
  console.log('queue suffix: ' + queueSuffix);

  var subscribeHeaders = {
    'destination': generateDestination(`/queue/Consumer.${queueSuffix}.VirtualTopic.${config.channel}`, config.bindingKeys),
    'ack': 'client-individual' //todo: check ack types
  };

  var subscription = client.subscribe(subscribeHeaders, function(error, message) {

    if (error) {
      console.log('subscribe error ' + error.message);
      return done(error);
    }

    message.readString('utf-8', function(error, body) {

      if (error) {
        console.log('read message error ' + error.message);
        return done(error);
      }

      // self.consumer = consumer = connection.consume(queueOptions.queue, _.clone(queueOptions), self._onMessage, done);
      self._onMessage(body);

      client.ack(message); //todo: acknowledgement
      //done();
      // client.disconnect();
    });
  });

  //todo: find correct way to ensure connection
  if (subscription && client.connected === true) {
    done(); //should emit 'consuming' for ensure connection is ok
  }

  function done(err) {
    if (err) return self.emit('error', err);
    self._emitConsuming();
  }
};

subscriber._getQueueOptions = function() {
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

exports.STOMPSubscriberAdapter = STOMPSubscriberAdapter;

exports.generateDestination = generateDestination;

//todo: extract it, and add unit tests
function generateDestination (destination, routingKey){
  var routings = !routingKey ? [''] : _.isString(routingKey) ? [routingKey] : routingKey;

  if (routings.length === 0) {
    return destination;
  }
  var combinedDestination = '';

  routings.forEach(function (value, index) {
    combinedDestination = combinedDestination + destination + '.' + value;
    if (index !== routings.length - 1) {
      combinedDestination = combinedDestination + ','
    }
  });

  return combinedDestination;
}
