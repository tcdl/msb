var EventEmitter = require('events').EventEmitter;
var simple = require('simple-mock');
var amqp = require('../../../lib/adapters/amqp');

describe('AMQP adapter', function() {
  var connection;
  var adapter;

  beforeEach(function() {
    connection = new EventEmitter();
    simple.mock(connection, 'close');
    simple.mock(amqp, '_createConnection').returnWith(connection);
    adapter = amqp.create();
  });

  it('should emit `connection` if connection emits `ready`', function(done) {
    adapter.Publish({reconnect: false});
    adapter.on('connection', done);
    connection.emit('ready');
  });

  it('should emit `error` if connection emits `close`', function(done) {
    adapter.Publish({reconnect: false});
    adapter.on('error', done);
    connection.emit('close');
  });

  it('should emit `disconnection` if connection emits `close` and reconnect enabled', function(done) {
    adapter.Publish({reconnect: true});
    adapter.on('disconnection', done);
    connection.emit('close');
  });

  it('should emit `error` if connection emits `error`', function(done) {
    adapter.Publish({reconnect: false});
    adapter.on('error', done);
    connection.emit('error');
  });

  it('should emit `close` if connection emits `close` after adapter was closed', function(done) {
    adapter.Publish({reconnect: false});
    adapter.on('close', done);
    adapter.close();
    connection.emit('close');
  });
});
