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
var serviceDetails = msb.serviceDetails;
var simple = require('simple-mock');
var mockChannels = require('./support/mockChannels');

/* Tests */
describe('channelManager', function() {
  var originalCreateProducer;
  var originalCreateConsumer;

  before(function(done) {
    originalCreateProducer = channelManager.createProducer;
    originalCreateConsumer = channelManager.createConsumer;

    channelManager.createProducer = mockChannels.createProducer;
    channelManager.createConsumer = mockChannels.createConsumer;

    // simple.mock(channelMonitor.config, 'heartbeatTimeoutMs', 500);
    // simple.mock(channelMonitor.config, 'heartbeatIntervalMs', 500);

    done();
  });

  after(function(done) {
    channelManager.createProducer = originalCreateProducer;
    channelManager.createConsumer = originalCreateConsumer;

    channelMonitor.stopMonitoring();
    channelMonitor.stopBroadcasting();

    done();
  });

  beforeEach(function(done) {
    channelMonitor.localInfoByTopic = {};
    channelMonitor.infoByTopic = {};
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
      simple.mock(channelMonitor.config, 'heartbeatIntervalMs', 0);
      channelMonitor.startMonitoring();

      var onUpdated = simple.mock();
      channelMonitor.on('updated', onUpdated);

      var earlierDate = new Date();
      var laterDate = new Date(earlierDate.valueOf() + 10000);

      // First broadcast
      simple.mock(serviceDetails, 'instanceId', 'abc123');

      channelMonitor.localInfoByTopic = {
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
      channelMonitor.doBroadcast();

      // Second broadcast
      simple.mock(serviceDetails, 'instanceId', 'abc456');

      channelMonitor.localInfoByTopic.def.lastConsumedAt = earlierDate;
      channelMonitor.localInfoByTopic.ghi = {
        producers: true,
        consumers: true
      };
      channelMonitor.doBroadcast();

      // On second update
      setTimeout(function() {
        expect(onUpdated.callCount).equals(2);

        expect(channelMonitor.infoByTopic.abc).exists();
        expect(channelMonitor.infoByTopic.abc.producers).deep.equal(['abc123', 'abc456']);

        expect(channelMonitor.infoByTopic.def).exists();
        expect(channelMonitor.infoByTopic.def.consumers).deep.equal(['abc123', 'abc456']);
        expect(channelMonitor.infoByTopic.def.lastConsumedAt.valueOf()).equals(laterDate.valueOf());

        expect(channelMonitor.infoByTopic.ghi).exists();
        expect(channelMonitor.infoByTopic.ghi.producers).deep.equal(['abc456']);
        expect(channelMonitor.infoByTopic.ghi.consumers).deep.equal(['abc456']);

        done();
      }, 1000);
    });
  });

  describe('doHeartbeat()', function() {
    afterEach(function(done) {
      channelMonitor.stopMonitoring();
      channelMonitor.stopBroadcasting();
      done();
    });

    it('collects info from broadcasters', function(done) {
      var onUpdated = simple.mock();
      channelMonitor.on('updated', onUpdated);

      channelMonitor.startBroadcasting();

      // Preload info
      channelMonitor.infoByTopic = {
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
      channelMonitor.localInfoByTopic = {
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
      simple.mock(channelMonitor.config, 'heartbeatIntervalMs', 0);
      channelMonitor.startMonitoring();

      // Do a heartbeat
      simple.mock(channelMonitor.config, 'heartbeatTimeoutMs', 500);
      channelMonitor.doHeartbeat();

      process.nextTick(function() {
        // Do a broadcast while heartbeat collects info
        simple.mock(serviceDetails, 'instanceId', 'abc456');

        channelMonitor.localInfoByTopic = {
          'abc': {
            producers: true,
            consumers: false
          },
          'ghi': {
            producers: false,
            consumers: true
          }
        };
        channelMonitor.doBroadcast();

        // Check the state after heartbeat had completed
        setTimeout(function() {
          expect(onUpdated.callCount).equals(2);

          expect(channelMonitor.infoByTopic.abc).exists();
          expect(channelMonitor.infoByTopic.abc.producers).deep.equal(['abc123', 'abc456']);
          expect(channelMonitor.infoByTopic.abc.consumers).deep.equal(['abc123']);

          expect(channelMonitor.infoByTopic.def).to.not.exist();

          expect(channelMonitor.infoByTopic.ghi).exists();
          expect(channelMonitor.infoByTopic.ghi.producers).deep.equal(['abc123']);
          expect(channelMonitor.infoByTopic.ghi.consumers).deep.equal(['abc123', 'abc456']);

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
      simple.mock(channelMonitor.config, 'heartbeatIntervalMs', 100);

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
      simple.mock(channelMonitor.config, 'heartbeatIntervalMs', 100);
      simple.mock(msb.Originator.prototype, 'removeListeners');
      simple.mock(channelMonitor, 'doHeartbeat');

      channelMonitor.startMonitoring();
      channelMonitor.stopMonitoring();

      expect(msb.Originator.prototype.removeListeners.called).true();
      expect(channelMonitor.doHeartbeat.callCount).equals(1);

      setTimeout(function() {
        expect(channelMonitor.doHeartbeat.callCount).equals(1);
        done();
      }, 250);
    });
  });

  describe('startBroadcasting()', function() {
    afterEach(function(done) {
      channelMonitor.stopBroadcasting();
      done();
    });

    it('enables listening to heartbeats and broadcasts new channels', function(done) {
      simple.mock(msb.Contributor, 'attachListener');

      channelMonitor.startBroadcasting();
      channelMonitor.startBroadcasting(); // Safe to call repeatedly
      expect(msb.Contributor.attachListener.callCount).equals(1);

      simple.mock(channelMonitor, 'doBroadcast');

      channelManager.emit(channelManager.PRODUCER_NEW_TOPIC_EVENT, 'pt');
      expect(channelMonitor.localInfoByTopic.pt).exists();
      expect(channelMonitor.localInfoByTopic.pt.producers).true();
      expect(channelMonitor.doBroadcast.callCount).equals(1);

      channelManager.emit(channelManager.CONSUMER_NEW_TOPIC_EVENT, 'ct');
      expect(channelMonitor.localInfoByTopic.ct).exists();
      expect(channelMonitor.localInfoByTopic.ct.consumers).true();
      expect(channelMonitor.doBroadcast.callCount).equals(2);

      channelManager.emit(channelManager.CONSUMER_NEW_MESSAGE_EVENT, 'cm');
      expect(channelMonitor.localInfoByTopic.cm).exists();
      expect(channelMonitor.localInfoByTopic.cm.lastConsumedAt).date();

      expect(channelMonitor.doBroadcast.callCount).equals(2);


      expect(channelMonitor.localInfoByTopic.ct).exists();
      expect(channelMonitor.localInfoByTopic.cm).exists();

      done();
    });
  });
});
