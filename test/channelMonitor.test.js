/* Setup */
var Lab = require('lab');
var Code = require('code');
var lab = exports.lab = Lab.script();

var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var beforeEach = lab.beforeEach;
var after = lab.after;
var afterEach = lab.afterEach;
var expect = Code.expect;

/* Modules */
var msb = require('..');
var channelManager = msb.channelManager;
var channelMonitor = msb.channelMonitor;
var channelMonitorAgent = msb.channelMonitorAgent;
var serviceDetails = msb.serviceDetails;
var simple = require('simple-mock');
var mockChannels = require('./support/mockChannels');

/* Tests */
describe('channelMonitor', function() {
  var originalCreateProducer;
  var originalCreateConsumer;

  before(function(done) {
    originalCreateProducer = channelManager.createProducer;
    originalCreateConsumer = channelManager.createConsumer;

    channelManager.createProducer = mockChannels.createProducer;
    channelManager.createConsumer = mockChannels.createConsumer;

    done();
  });

  after(function(done) {
    channelManager.createProducer = originalCreateProducer;
    channelManager.createConsumer = originalCreateConsumer;

    channelMonitor.stopMonitoring();
    channelMonitorAgent.stopBroadcasting();

    done();
  });

  beforeEach(function(done) {
    channelMonitorAgent.doc = {};
    channelMonitor.doc = {};
    done();
  });

  afterEach(function(done) {
    simple.restore();
    done();
  });

  describe('doBroadcast()', function() {
    afterEach(function(done) {
      channelMonitor.stopMonitoring();
      done();
    });

    it('can update info on the monitor', function(done) {
      simple.mock(channelMonitor, 'heartbeatIntervalMs', 0);
      channelMonitor.startMonitoring();

      var onUpdated = simple.mock();
      channelMonitor.on('updated', onUpdated);

      var earlierDate = new Date();
      var laterDate = new Date(earlierDate.valueOf() + 10000);

      // First broadcast
      simple.mock(serviceDetails, 'instanceId', 'abc123');

      channelMonitorAgent.doc = {
        'abc': {
          producers: true,
          consumers: false
        },
        'def': {
          producers: false,
          consumers: true,
          lastConsumedAt: laterDate
        }
      };
      channelMonitorAgent.doBroadcast();

      setTimeout(function() {
        // Second broadcast
        simple.mock(serviceDetails, 'instanceId', 'abc456');

        channelMonitorAgent.doc.def.lastConsumedAt = earlierDate;
        channelMonitorAgent.doc.ghi = {
          producers: true,
          consumers: true
        };
        channelMonitorAgent.doBroadcast();

        // On second update
        setTimeout(function() {
          expect(onUpdated.callCount).equals(2);

          expect(channelMonitor.doc.infoByTopic.abc).exists();
          expect(channelMonitor.doc.infoByTopic.abc.producers).deep.equal(['abc123', 'abc456']);

          expect(channelMonitor.doc.infoByTopic.def).exists();
          expect(channelMonitor.doc.infoByTopic.def.consumers).deep.equal(['abc123', 'abc456']);
          expect(channelMonitor.doc.infoByTopic.def.lastConsumedAt.valueOf()).equals(laterDate.valueOf());

          expect(channelMonitor.doc.infoByTopic.ghi).exists();
          expect(channelMonitor.doc.infoByTopic.ghi.producers).deep.equal(['abc456']);
          expect(channelMonitor.doc.infoByTopic.ghi.consumers).deep.equal(['abc456']);

          done();
        }, 100);
      }, 100);
    });
  });

  describe('doHeartbeat()', function() {
    afterEach(function(done) {
      channelMonitor.stopMonitoring();
      channelMonitorAgent.stopBroadcasting();
      channelMonitor.removeAllListeners('updated');
      done();
    });

    it('collects info from broadcasters', function(done) {
      var onUpdated = simple.mock();
      channelMonitor.on('updated', onUpdated);

      channelMonitorAgent.startBroadcasting();

      // Preload info
      channelMonitor.doc = {
        'abc': {
          producers: [],
          consumers: []
        },
        'def': {
          producers: [],
          consumers: []
        },
        'ghi': {
          producers: [],
          consumers: []
        }
      };

      // Prepare for heartbeat response
      simple.mock(serviceDetails, 'instanceId', 'abc123');
      channelMonitorAgent.doc = {
        'abc': {
          producers: true,
          consumers: true
        },
        'ghi': {
          producers: true,
          consumers: true
        }
      };
      // Listen for broadcasts
      simple.mock(channelMonitor, 'heartbeatIntervalMs', 0);
      channelMonitor.startMonitoring();

      // Do a heartbeat
      simple.mock(channelMonitor, 'heartbeatTimeoutMs', 500);
      channelMonitor.doHeartbeat();

      process.nextTick(function() {
        // Do a broadcast while heartbeat collects info
        simple.mock(serviceDetails, 'instanceId', 'abc456');

        channelMonitorAgent.doc = {
          'abc': {
            producers: true,
            consumers: false
          },
          'ghi': {
            producers: false,
            consumers: true
          }
        };
        channelMonitorAgent.doBroadcast();

        // Check the state after heartbeat had completed
        setTimeout(function() {
          expect(onUpdated.callCount).equals(2);

          expect(channelMonitor.doc.infoByTopic.abc).exists();
          expect(channelMonitor.doc.infoByTopic.abc.producers).deep.equal(['abc123', 'abc456']);
          expect(channelMonitor.doc.infoByTopic.abc.consumers).deep.equal(['abc123']);

          expect(channelMonitor.doc.infoByTopic.def).to.not.exist();

          expect(channelMonitor.doc.infoByTopic.ghi).exists();
          expect(channelMonitor.doc.infoByTopic.ghi.producers).deep.equal(['abc123']);
          expect(channelMonitor.doc.infoByTopic.ghi.consumers).deep.equal(['abc123', 'abc456']);

          done();
        }, 501);
      });
    });
  });

  describe('startMonitoring()', function() {
    afterEach(function(done) {
      channelMonitor.stopMonitoring();
      done();
    });

    it('will start heartbeat with interval', function(done) {
      simple.mock(channelMonitor, 'doHeartbeat').returnWith();
      simple.mock(channelMonitor, 'heartbeatIntervalMs', 100);

      channelMonitor.startMonitoring();
      channelMonitor.startMonitoring(); // Safe to call repeatedly
      setTimeout(function() {
        expect(channelMonitor.doHeartbeat.callCount).equals(3);

        done();
      }, 250);
    });
  });

  describe('stopMonitoring()', function() {
    it('removes all listeners and stops current heartbeat collector', function(done) {
      simple.mock(channelMonitor, 'heartbeatIntervalMs', 100);
      simple.mock(msb.Requester.prototype, 'removeListeners');
      simple.mock(channelMonitor, 'doHeartbeat');

      channelMonitor.startMonitoring();
      channelMonitor.stopMonitoring();

      expect(msb.Requester.prototype.removeListeners.called).true();
      expect(channelMonitor.doHeartbeat.callCount).equals(1);

      setTimeout(function() {
        expect(channelMonitor.doHeartbeat.callCount).equals(1);
        done();
      }, 250);
    });
  });

  describe('startBroadcasting()', function() {
    afterEach(function(done) {
      channelMonitorAgent.stopBroadcasting();
      done();
    });

    it('enables listening to heartbeats and broadcasts new channels', function(done) {
      simple.mock(msb.Responder, 'createEmitter');

      channelMonitorAgent.startBroadcasting();
      channelMonitorAgent.startBroadcasting(); // Safe to call repeatedly
      expect(msb.Responder.createEmitter.callCount).equals(1);

      simple.mock(channelMonitorAgent, 'doBroadcast');

      channelManager.emit(channelManager.PRODUCER_NEW_TOPIC_EVENT, 'pt');
      expect(channelMonitorAgent.doc.pt).exists();
      expect(channelMonitorAgent.doc.pt.producers).true();
      expect(channelMonitorAgent.doBroadcast.callCount).equals(1);

      channelManager.emit(channelManager.PRODUCER_NEW_MESSAGE_EVENT, '_private');
      expect(channelMonitorAgent.doc._private).not.exists();

      channelManager.emit(channelManager.PRODUCER_NEW_MESSAGE_EVENT, 'cm');
      expect(channelMonitorAgent.doc.cm).exists();
      expect(channelMonitorAgent.doc.cm.lastProducedAt).date();

      channelManager.emit(channelManager.CONSUMER_NEW_TOPIC_EVENT, 'ct');
      expect(channelMonitorAgent.doc.ct).exists();
      expect(channelMonitorAgent.doc.ct.consumers).true();
      expect(channelMonitorAgent.doBroadcast.callCount).equals(2);

      channelManager.emit(channelManager.CONSUMER_NEW_MESSAGE_EVENT, '_private');
      expect(channelMonitorAgent.doc._private).not.exists();

      channelManager.emit(channelManager.CONSUMER_NEW_MESSAGE_EVENT, 'cm');
      expect(channelMonitorAgent.doc.cm).exists();
      expect(channelMonitorAgent.doc.cm.lastConsumedAt).date();

      channelManager.emit(channelManager.CONSUMER_REMOVED_TOPIC_EVENT, '_private');
      expect(channelMonitorAgent.doc._private).not.exists();

      channelManager.emit(channelManager.CONSUMER_REMOVED_TOPIC_EVENT, 'cr');
      expect(channelMonitorAgent.doc.cr).exists();
      expect(channelMonitorAgent.doc.cr.consumers).false();

      expect(channelMonitorAgent.doBroadcast.callCount).equals(2);
      done();
    });
  });
});
