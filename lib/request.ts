const _ = require("lodash");
import validateWithSchema = require("./validateWithSchema");
import {Requester} from "./requester";

exports = function (options, payload, cb) {
  if (_.isString(options)) {
    options = {
      namespace: options,
      waitForResponses: 1
    };
  } else if (!('waitForResponses' in options)) {
    options.waitForResponses = 1;
  }

  options = _.clone(options);

  const channelManager = options.channelManager;
  delete(options.channelManager);

  const originalMessage = options.originalMessage;
  delete(options.originalMessage);

  const responseSchema = options.responseSchema;
  delete(options.responseSchema);

  const requester = new Requester(options, originalMessage);
  let responsePayload;
  let responseMessage;

  let onResponseFn = function (payload, message) {
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
