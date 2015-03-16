var util = require('util');
var _ = require('lodash');
var async = require('async');
var msb = require('..');
var ContributorResponse = require('./contributorResponse');

function ContributorServer(config) {
  this.config = config;
  this._stack = [];
  this._errStack = [];
}

var contributorServer = ContributorServer.prototype;

contributorServer.use = function(middleware) {
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

contributorServer.onContributor = function(contributor) {
  var self = this;
  var request = contributor.originalMessage.payload;
  var response = new ContributorResponse(contributor);

  async.applyEach(this._stack, request, response, function(err) {
    if (!self._errStack.length) return _errorHandler(err, request, response);
    async.applyEach(self._errStack, err, request, response, _errorHandler);
  });
};

contributorServer.listen = function() {
  if (this.emitter) throw new Error('Already listening');

  var emitter = this.emitter = msb.Contributor.createEmitter(this.config);
  emitter.on('contributor', this.onContributor.bind(this));
  return this;
};

contributorServer.close = function() {
  if (!this.emitter) throw new Error('Not listening');

  this.emitter.end();
  delete(this.emitter);
};

function _errorHandler(err, request, response) {
  response.writeHead(err.statusCode || 500);
  response.end();
}

module.exports = ContributorServer;
