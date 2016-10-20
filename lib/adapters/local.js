'use strict';
var EventEmitter = require('events').EventEmitter;
var queue = exports;
queue.create = function () {
    var queue = {};
    var localBus = new EventEmitter();
    queue.Publish = function (config) {
        return {
            channel: function (topic) {
                return {
                    publish: function (message, cb) {
                        var clonedMessage = JSON.parse(JSON.stringify(message));
                        process.nextTick(function () {
                            localBus.emit(topic, clonedMessage);
                            (cb || _noop)();
                        });
                    },
                    close: _noop
                };
            }
        };
    };
    queue.Subscribe = function (config) {
        var channel = new EventEmitter();
        function onMessage(message) {
            try {
                channel.emit('message', message);
            }
            catch (err) {
                channel.emit('error', err);
            }
        }
        localBus.on(config.channel, onMessage);
        channel.close = function () {
            localBus.removeListener('message', onMessage);
        };
        return channel;
    };
    return queue;
};
function _noop() { }
