// /* Setup */
// var expect = require('chai').expect;
//
// /* Modules */
// var simple = require('simple-mock');
// var msb = require('..');
// var Responder = msb.Responder;
// var channelManager = msb.channelManager;
//
// /* Tests */
// describe('Responder', function() {
//   afterEach(function(done) {
//     simple.restore();
//     done();
//   });
//
//   describe('()', function() {
//
//     it('cannot be initialized without a config', function(done) {
//
//       expect(function() {
//         var responder = new Responder(null, {});
//       }).to.throw();
//
//       done();
//     });
//
//     it('cannot be initialized without an original message', function(done) {
//
//       expect(function() {
//         var responder = new Responder({});
//       }).to.throw();
//
//       done();
//     });
//
//     it('can be initialized', function(done) {
//
//       var responder = Responder({}, { topics: {} });
//
//       done();
//     });
//   });
//
//   describe('sendAck()', function() {
//     var responder;
//
//     beforeEach(function(done) {
//       responder = new Responder({}, { topics: { response: 'response' } });
//
//       simple.mock(responder, '_sendMessage').returnWith();
//
//       done();
//     });
//
//     it('can be called without params', function(done) {
//       expect(function() {
//         responder.sendAck();
//       }).to.not.throw();
//
//       expect(responder.ack.timeoutMs).equals(null);
//       expect(responder.ack.responsesRemaining).equals(1);
//
//       expect(responder._sendMessage.called).to.be.true;
//
//       var message = responder._sendMessage.lastCall.args[0];
//       expect(message.ack).deep.equals(responder.ack);
//
//       done();
//     });
//
//     it('can be called with only a timeout', function(done) {
//       expect(function() {
//         responder.sendAck(333);
//       }).to.not.throw();
//
//       expect(responder.ack.timeoutMs).equals(333);
//       expect(responder.ack.responsesRemaining).equals(1);
//
//       expect(responder._sendMessage.called).to.be.true;
//
//       var message = responder._sendMessage.lastCall.args[0];
//       expect(message.ack).deep.equals(responder.ack);
//
//       done();
//     });
//
//     it('can be called with only a responses remaining', function(done) {
//       expect(function() {
//         responder.sendAck(null, 5);
//       }).to.not.throw();
//
//       expect(responder.ack.timeoutMs).equals(null);
//       expect(responder.ack.responsesRemaining).equals(5);
//
//       expect(responder._sendMessage.called).to.be.true;
//
//       var message = responder._sendMessage.lastCall.args[0];
//       expect(message.ack).deep.equals(responder.ack);
//
//       done();
//     });
//
//     it('can be called with only a cb', function(done) {
//       var cb = simple.mock();
//
//       expect(function() {
//         responder.sendAck(cb);
//       }).to.not.throw();
//
//       expect(responder.ack.timeoutMs).equals(null);
//       expect(responder.ack.responsesRemaining).equals(1);
//
//       expect(responder._sendMessage.called).to.be.true;
//       expect(responder._sendMessage.lastCall.args[1]).equals(cb);
//
//       var message = responder._sendMessage.lastCall.args[0];
//       expect(message.ack).deep.equals(responder.ack);
//
//       done();
//     });
//
//     it('can be called with timeout, responses remaining and a cb', function(done) {
//       var cb = simple.mock();
//
//       expect(function() {
//         responder.sendAck(444, 5, cb);
//       }).to.not.throw();
//
//       expect(responder.ack.timeoutMs).equals(444);
//       expect(responder.ack.responsesRemaining).equals(5);
//
//       expect(responder._sendMessage.called).to.be.true;
//       expect(responder._sendMessage.lastCall.args[1]).equals(cb);
//
//       var message = responder._sendMessage.lastCall.args[0];
//       expect(message.ack).deep.equals(responder.ack);
//
//       done();
//     });
//
//     it('can be called with only a timeout and cb', function(done) {
//       var cb = simple.mock();
//
//       expect(function() {
//         responder.sendAck(); // Setup
//         responder.ack.responsesRemaining = 10;
//       }).to.not.throw();
//
//       expect(function() {
//         responder.sendAck(333, cb);
//       }).to.not.throw();
//
//       expect(responder.ack.timeoutMs).equals(333);
//       expect(responder.ack.responsesRemaining).equals(1);
//
//       expect(responder._sendMessage.called).to.be.true;
//
//       var message = responder._sendMessage.lastCall.args[0];
//       expect(message.ack).deep.equals(responder.ack);
//
//       done();
//     });
//   });
//
//   describe('send()', function() {
//     var responder;
//     var mockChannel;
//
//     beforeEach(function(done) {
//       responder = new Responder({}, { topics: { response: 'response' } });
//
//       simple.mock(responder, '_sendMessage');
//
//       done();
//     });
//   });
//
//   describe('_sendMessage()', function() {
//     var responder;
//     var mockChannel;
//
//     beforeEach(function(done) {
//       responder = new Responder({}, { topics: { response: 'response' } });
//
//       mockChannel = {};
//       simple.mock(mockChannel, 'publish');
//       simple.mock(channelManager, 'findOrCreateProducer').returnWith(mockChannel);
//
//       done();
//     });
//
//     it('can be called with a cb', function(done) {
//       var cb = simple.mock();
//
//       expect(function() {
//         responder._sendMessage({
//           topics: { to: 'example' }
//         }, cb);
//       }).to.not.throw();
//
//       expect(channelManager.findOrCreateProducer.called).to.be.true;
//       expect(channelManager.findOrCreateProducer.lastCall.args[0]).equals('example');
//       expect(mockChannel.publish.called).to.be.true;
//       expect(mockChannel.publish.lastCall.args[1]).equals(cb);
//
//       var message = JSON.parse(JSON.stringify(mockChannel.publish.lastCall.args[0]));
//       expect(message.meta).deep.equals(JSON.parse(JSON.stringify(responder.meta)));
//
//       done();
//     });
//
//     it('can be called without a cb', function(done) {
//       expect(function() {
//         responder._sendMessage({
//           topics: { to: 'example' }
//         });
//       }).to.not.throw();
//
//       expect(channelManager.findOrCreateProducer.called).to.be.true;
//       expect(channelManager.findOrCreateProducer.lastCall.args[0]).equals('example');
//       expect(mockChannel.publish.called).to.be.true;
//
//       var message = JSON.parse(JSON.stringify(mockChannel.publish.lastCall.args[0]));
//       expect(message.meta).deep.equals(JSON.parse(JSON.stringify(responder.meta)));
//
//       done();
//     });
//   });
//
// });
