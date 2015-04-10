var _ = require('lodash');
var util = require('util');
var http = require('http');
var ServerResponse = http.ServerResponse;

function ResponderResponse(responder) {
  this.responder = responder;
  this.body = null;

  /* start Core compatibility */
  this._hasBody = (responder.originalMessage.payload.method === 'HEAD') ? false : true;
  this._header = null;
  this._headers = null;
  this._headerNames = {};
  /* end Core compatibiltiy */
}

var response = ResponderResponse.prototype;

// Inherit from Core
_.extend(response, _.pick(ServerResponse.prototype,
  'statusCode',
  'statusMessage',
  'writeHead',
  'setHeader',
  'getHeader',
  'removeHeader',
  '_renderHeaders'
));

response.end = function(body, cb) {
  if (!cb && typeof body === 'function') {
    cb = body;
    body = this.body;
  } else {
    body = body || this.body;
  }

  if (!this._header) {
    this.writeHead(this.statusCode);
  }

  var payload = {
    statusCode: this.statusCode,
    body: null
  };

  if (this._header) {
    payload.headers = this._header;
  }

  if (body && this._hasBody) {
    if (body instanceof Buffer) {
      payload.bodyBuffer = body.toString('base64');
    } else {
      payload.body = body;
    }
  }
  return this.responder.send(payload, cb);
};

response._storeHeader = function(statusLine, renderedHeaders) {
  /* Core safety  */
  this._header = renderedHeaders;
};

module.exports = ResponderResponse;
