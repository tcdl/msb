import {Message, MessagePayload} from "./messageFactory";
import {Requester} from "./requester";
import validateWithSchema = require("./validateWithSchema");

const _ = require("lodash");

export default function (options: any, payload: MessagePayload, cb: (err: Error, payload: MessagePayload, message: Message) => void) {
  if (_.isString(options)) {
    options = {
      namespace: options,
      waitForResponses: 1
    };
  } else if (!("waitForResponses" in options)) {
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
  let responsePayload: MessagePayload;
  let responseMessage: Message;

  let onResponseFn = function (payload: MessagePayload, message: Message) {
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
    .on("payload", onResponseFn)
    .once("error", cb)
    .once("end", function () {
      cb(null, responsePayload, responseMessage);
    });

  return requester.publish(payload);
};
