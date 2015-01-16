'use strict';
var middleware = require('../lib/middleware')({
  namespace: 'test.aggregator'
});

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
