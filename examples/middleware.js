'use strict';
var _ = require('lodash');
var msb = require('..');
var Requester = msb.Requester;

msb.channelMonitor.startBroadcasting();

/*
  Returns a middleware that publishes incoming requests and responds where a response can be constructed.

  @param {object} config
  @param {string} config.namespace
  @param {number} [config.responseTimeout=3000]
  @param {number} [config.waitForResponses=-1] 0=return immediately, 1+=return after n responses, -1=wait until timeout
*/
var middleware = function(req, res, next) {
  var requester = new Requester({
    namespace: 'test:aggregator',
    waitForResponses: 1
  });

  requester
  .publish({
    url: req.url,
    method: req.method,
    headers: req.headers,
    params: req.params,
    query: req.query,
    body: req.body
  })
  .once('error', next)
  .on('ack', console.log)
  .on('response', console.log)
  .once('end', function() {
    var lastResponse = _.last(requester.responseMessages).payload;

    var statusCode = lastResponse.statusCode;
    var headers = lastResponse.headers;
    var body = lastResponse.body;

    res.writeHead(lastResponse.statusCode, lastResponse.headers);
    res.end(body || null);
  });
};

var mockReq = {
  url: 'http://mock',
  method: 'GET',
  headers: {},
  params: {},
  query: {},
  body: {}
};

var mockRes = {
  writeHead: console.log,
  end: console.log
};

middleware(mockReq, mockRes, console.log);
