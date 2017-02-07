import {Responder, validateWithSchema, messageFactory} from "../../..";

let i = 1001;
const payloadSchema = {
  type: "object",
  properties: {
    body: {type: "object"},
  },
};

export function createLocalResponder() {
  let responderEmitter = Responder.createEmitter({
    namespace: "test:general",
    tags: ["b"],
  }).on('responder', (responder : Responder) => {
    let payload = {body: null, statusCode: null};
    const request = responder.originalMessage.payload;
    try {
      //validation
      validateWithSchema.validateWithSchema(payloadSchema, request);

      //send ack if not an error
      if (request.body && request.body.instruction === "error")
        throw new Error();
      responder.sendAck(1500);

      //send body
      payload.body = i++;
      payload.statusCode = 200;
      responder.send(payload);

    } catch (error) {
      //error handler
      if (error.name === "SchemaValidationError") {
        payload.statusCode = error.statusCode;
      } else {
        payload.body = "Special Message";
        payload.statusCode = 500;
      }
        responder.send(payload);
    }
  });
  return responderEmitter;
}
