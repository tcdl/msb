'use strict';
var _ = require('lodash');
var msb = require('..');
var Originator = msb.Originator;

msb.channelManager.startHeartbeatContributor();

/*
  Returns a middleware that publishes incoming requests and responds where a response can be constructed.

  @param {object} config
  @param {string} config.namespace
  @param {number} [config.contribTimeout=3000]
  @param {number} [config.waitForContribs=-1] 0=return immediately, 1+=return after n contribs, -1=wait until timeout
*/
var middleware = function(req, res, next) {
  var originator = new Originator({
    namespace: 'test.aggregator',
    waitForContribs: 1
  });

  _.merge(originator.message.req, {
    url: req.url,
    method: req.method,
    headers: req.headers,
    params: req.params,
    query: req.query,
    body: req.body
  });

  originator
  .publish()
  .once('error', next)
  .on('ack', console.log)
  .on('contrib', console.log)
  .once('end', function(message) {
    var statusCode = message.res.statusCode;
    var headers = message.res.headers;
    var body = message.res.body;

    res.writeHead(message.res.statusCode, message.res.headers);
    res.end((body && JSON.stringify(body)) || null);
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
