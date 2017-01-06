const async = require("async");
import {Responder} from "../../..";

export function createMockResponder(config, channelManager): any {
  let requests = [];
  let stack = [];
  let waitTimeouts = [];
  let emitter = Responder.createEmitter(config, channelManager);

  let i = 0;
  emitter.on("responder", function (responder): void {
    requests.push(responder.originalMessage);

    let responses = stack[i++];

    if (!responses) return;

    async.eachSeries(responses, (response, next) => {
      function respond(): void {
        if (response.type === "ack") {
          return responder.sendAck(response.timeoutMs,
            response.responsesRemaining, next);
        }
        responder.send(response.payload, next);
      }

      if (response.waitMs) {
        waitTimeouts.push(setTimeout(respond, response.waitMs));
      } else {
        respond();
      }
    }, () => {
    });
  });

  return {
    requests: requests,
    respondWith: (responses): any => {
      stack.push(responses);
      return this;
    },
    end: (): void => {
      waitTimeouts.forEach(clearTimeout);
      emitter.end();
    },
  };
}
