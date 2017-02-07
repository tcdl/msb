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
    try {
      //validation
      console.log('message is ----- ' + JSON.stringify(responder.originalMessage.payload));
      validateWithSchema.validateWithSchema(payloadSchema, responder.originalMessage.payload);
      console.log('after validation');
      //send ack if not an error
      //send body
      payload.body = ++i;
      responder.send(payload);
    } catch (error) {
      console.log('error is ' + error.name);
      //error handler
      if (error.name === "SchemaValidationError") {
        responder.send()
      }
      payload.body = "Special Message";
      payload.statusCode = 500;
      responder.send(payload);
    }
  });
  return responderEmitter;

  //return Responder.createServer({
  //  namespace: "test:general",
  //  tags: ["b"],
  //})
  //  .use(validateWithSchema.middleware(payloadSchema))
  //  .use([
  //    (request: any, response: any, next: any): void => {
  //      if (request.body && request.body.instruction === "error") {
  //        next(new Error());
  //      } else {
  //        next();
  //      }
  //    },
  //    (request, response, next): void => {
  //      response.responder.sendAck(1500, next);
  //    },
  //  ])
  //  .use((request, response, next) => {
  //    response.body = i++;
  //    response.end();
  //  })
  //  .use((err, request, response, next) => {
  //    if (err.name === "SchemaValidationError") return next();
  //
  //    response.writeHead(500);
  //    response.body = "Special Message";
  //    response.end();
  //  });
}
