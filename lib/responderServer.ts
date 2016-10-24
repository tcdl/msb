var util = require('util');
var _ = require('lodash');
var async = require('async');
var msb = require('..');
var ResponderResponse_ = require('./responderResponse');

/**
 * For every request received on the configured channel, create a response and process using middleware-like chain
 *
 * @param {Object} config
 * @param {String} config.namespace
 */
function ResponderServer(config) {
  this.config = config;
  this._stack = [];
  this._errStack = [];
}

var responderServer = ResponderServer.prototype;

responderServer.use = function(middleware) {
  this._stack.push(middleware);
  if (util.isArray(middleware)) {
    this._stack = _.flatten(this._stack);
  }

  var errStack = this._errStack;
  var prevLength = errStack.length;
  this._stack.forEach(function(fn) {
    if (fn.length > 3) errStack.push(fn);
  });

  if (errStack.length > prevLength) {
    this._stack = _.without.apply(_, [this._stack].concat(errStack));
  }
  return this;
};

responderServer.onResponder = function(responder) {
  var self = this;
  var request = responder.originalMessage.payload;
  var response = new ResponderResponse_(responder);

  async.applyEachSeries(this._stack, request, response, function(err) {
    if (!err) return;
    if (!self._errStack.length) return _errorHandler(request, response, err);
    async.applyEachSeries(self._errStack, err, request, response, _errorHandler.bind(null, request, response, err));
  });
};

responderServer.listen = function(channelManager) {
  if (this.emitter) throw new Error('Already listening');

  var emitter = this.emitter = msb.Responder.createEmitter(this.config, channelManager);
  emitter.on('responder', this.onResponder.bind(this));
  return this;
};

responderServer.close = function() {
  if (!this.emitter) throw new Error('Not listening');

  this.emitter.end();
  delete(this.emitter);
};

function _errorHandler(request, response, err, ultimateErr?) {
  err = ultimateErr || err;
  response.writeHead(err.statusCode || 500);
  response.end();
}

exports = ResponderServer;
