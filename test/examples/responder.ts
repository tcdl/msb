import {Responder, validateWithSchema, msb} from "../../msb";

let i = 1001;
const payloadSchema: msb.JsonSchema = {
 type: "object",
 properties: {
   body: { type: "object" }
 }
};

module.exports = Responder.createServer({
 namespace: "test:general"
 // tags: ["b"]
})
// Validation middleware
.use(validateWithSchema.middleware(payloadSchema))
// Arrays of middleware
.use(function(request, response, next) {
   if ((request as any).body && (request as any).body.instruction === "error") return next(new Error());
   next();
})
.use(function(request, response, next) {
    (response as any).responder.sendAck(1500, next); // Requester should wait at least 1.5s for response
})
// Normal response
.use(function(request, response, next) {
    (response as any).body = i++;
    (response as any).end();
});
// Custom error handler
// .use(function(err: Error, request: Object, response: Object, next: Function): any {
//  if (err.name === "SchemaValidationError") return next();
//
//  response.writeHead(500);
//  response.body = "Special Message";
//  response.end();
// });

if (!module.parent) module.exports.listen();
