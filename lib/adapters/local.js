"use strict";
var events_1 = require("events");
var LocalBrokerAdapter = (function () {
    function LocalBrokerAdapter() {
        this.localBus = new events_1.EventEmitter();
    }
    LocalBrokerAdapter.prototype.Publish = function (config) {
        var adapter = this;
        return {
            channel: function (topic) {
                return {
                    publish: function (message, cb) {
                        var clonedMessage = JSON.parse(JSON.stringify(message));
                        process.nextTick(function () {
                            adapter.localBus.emit(topic, clonedMessage);
                            (cb || _noop)();
                        });
                    },
                    close: _noop
                };
            }
        };
    };
    LocalBrokerAdapter.prototype.Subscribe = function (config) {
        var _this = this;
        var channel = new events_1.EventEmitter();
        function onMessage(message) {
            try {
                channel.emit("message", message);
            }
            catch (err) {
                channel.emit("error", err);
            }
        }
        this.localBus.on(config.channel, onMessage);
        return Object.create(channel, {
            close: function () { return _this.localBus.removeListener("message", onMessage); },
            onceConsuming: _noop,
            confirmProcessedMessage: _noop,
            rejectMessage: _noop
        });
    };
    LocalBrokerAdapter.prototype.close = function () {
    };
    return LocalBrokerAdapter;
}());
function create() {
    return new LocalBrokerAdapter();
}
exports.create = create;
function _noop() { }
