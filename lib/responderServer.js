var util = require('util');
var _ = require('lodash');
var async = require('async');
var msb = require('..');
var ResponderResponse = require('./responderResponse');

function ResponderServer(config) {
  this.config = config;
  this._stack = [];
  this._errStack = [];
}

var responderServer = ResponderServer.prototype;

responderServer.use = function(middleware) {
  this._stack.push(middleware);
  if (util.isArray(middleware)) {
    this._stack = _.flattenDeep(this._stack);
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
  var response = new ResponderResponse(responder);

  async.applyEach(this._stack, request, response, function(err) {
    if (!self._errStack.length) return _errorHandler(err, request, response);
    async.applyEach(self._errStack, err, request, response, _errorHandler);
  });
};

responderServer.listen = function() {
  if (this.emitter) throw new Error('Already listening');

  var emitter = this.emitter = msb.Responder.createEmitter(this.config);
  emitter.on('responder', this.onResponder.bind(this));
  return this;
};

responderServer.close = function() {
  if (!this.emitter) throw new Error('Not listening');

  this.emitter.end();
  delete(this.emitter);
};

function _errorHandler(err, request, response) {
  response.writeHead(err && err.statusCode || 500);
  response.end();
}

module.exports = ResponderServer;
