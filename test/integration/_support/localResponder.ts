import {Responder, validateWithSchema} from "../../..";
let i = 1001;
const payloadSchema = {
  type: "object",
  properties: {
    body: {type: "object"}
  }
};

export function createLocalResponder() {
  return Responder.createServer({
    namespace: "test:general",
    tags: ["b"]
  })
    .use(validateWithSchema.middleware(payloadSchema))
    .use([
      (request, response, next) => {
        if (request.body && request.body.instruction === "error") {
          return next(new Error());
        }

        next();
      },
      (request, response, next) => {
        response.responder.sendAck(1500, next);
      }
    ])
    .use((request, response, next) => {
      response.body = i++;
      response.end();
    })
    .use((err, request, response, next) => {
      if (err.name === "SchemaValidationError") return next();

      response.writeHead(500);
      response.body = "Special Message";
      response.end();
    });
}
