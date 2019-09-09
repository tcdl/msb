var activemq = require('../../../lib/adapters/activemq');
var EventEmitter = require('events').EventEmitter;
var simple = require('simple-mock');
var expect = require('chai').expect;

describe('ActiveMQ adapter', function() {
  var connection;
  var adapter;

  beforeEach(function() {
    connection = new EventEmitter();
    connection.close = function () {};
    simple.mock(connection, 'disconnect');
    simple.mock(activemq, '_createConnection').returnWith(connection);
    adapter = activemq.create();
  });

  describe('Events', function() {

    var payload = {};

    it('should emit `connection` if connection emits `connection_open`', function(done) {
      adapter.Publish({reconnect: false});
      adapter.on('connection', done);
      connection.emit('connection_open');
    });

    it('should emit `error` if connection emits `connection_close`', function(done) {
      adapter.Publish({reconnect: false});
      adapter.on('error', function(event) {
        expect(event).to.be.equal(payload);
        done();
      });
      connection.emit('connection_close', payload);
    });

    it('should emit `disconnection` if connection emits `connection_close` and reconnect enabled', function(done) {
      adapter.Publish({reconnect: true});
      adapter.on('disconnection', function(event) {
        expect(event).to.be.equal(payload);
        done();
      });
      connection.emit('connection_close', payload);
    });

    it('should emit `error` if connection emits `connection_error`', function(done) {
      adapter.Publish({reconnect: false});
      adapter.on('error', function(event) {
        expect(event).to.be.equal(payload);
        done();
      });
      connection.emit('connection_error', payload);
    });

    it('should emit `close` if connection emits `connection_close` after adapter was closed', function(done) {
      adapter.Publish({reconnect: false});
      adapter.on('close', function(event) {
        expect(event).to.be.equal(payload);
        done();
      });
      adapter.close();
      connection.emit('connection_close', payload);
    });

  });
});
