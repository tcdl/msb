var _ = require('lodash');
var validateWithSchema = require('./validateWithSchema');
var Requester = require('./requester');

module.exports = function(options, payload, cb) {
  if (_.isString(options)) {
    options = {
      namespace: options,
      waitForResponses: 1
    };
  } else if (!('waitForResponses' in options)) {
    options.waitForResponses = 1;
  }

  var originalMessage = options.originalMessage;
  delete(options.originalMessage);

  var responseSchema = options.responseSchema;
  delete(options.responseSchema);

  var requester = new Requester(options, originalMessage);
  var responsePayload;
  var responseMessage;

  var onResponseFn = function(payload, message) {
    responsePayload = payload;
    responseMessage = message;
  };

  if (responseSchema) {
    onResponseFn = validateWithSchema.onEvent(responseSchema, onResponseFn);
  }

  requester
  .on('response', onResponseFn)
  .once('error', cb)
  .once('end', function() {
    cb(null, responsePayload, responseMessage);
  });

  return requester.publish(payload);
};
