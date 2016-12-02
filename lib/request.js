var _ = require('lodash');
var validateWithSchema = require('./validateWithSchema');
var Requester_ = require('./requester');
module.exports = function (options, payload, cb) {
    if (_.isString(options)) {
        options = {
            namespace: options,
            waitForResponses: 1
        };
    }
    else if (!('waitForResponses' in options)) {
        options.waitForResponses = 1;
    }
    options = _.clone(options);
    var channelManager = options.channelManager;
    delete (options.channelManager);
    var originalMessage = options.originalMessage;
    delete (options.originalMessage);
    var responseSchema = options.responseSchema;
    delete (options.responseSchema);
    var requester = new Requester_(options, originalMessage);
    var responsePayload;
    var responseMessage;
    var onResponseFn = function (payload, message) {
        responsePayload = payload;
        responseMessage = message;
    };
    if (responseSchema) {
        onResponseFn = validateWithSchema.onEvent(responseSchema, onResponseFn);
    }
    if (channelManager) {
        requester.channelManager = channelManager;
    }
    requester
        .on('response', onResponseFn)
        .once('error', cb)
        .once('end', function () {
        cb(null, responsePayload, responseMessage);
    });
    return requester.publish(payload);
};
