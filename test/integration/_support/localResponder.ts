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
      (request: any, response: any, next: any): void => {
        if (request.body && request.body.instruction === "error") {
          next(new Error());
        } else {
          next();
        }
      },
      (request, response, next): void => {
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
