import {isArray} from "util";
const _ = require("lodash");
const async = require("async");
import {ResponderResponse} from "./responderResponse";
import {Responder} from "./responder";

export class ResponderServer {
  config: Object;
  _stack: Function[];
  _errStack: Function[];
  emitter: any;

  constructor(config: Object) {
    this.config = config;
    this._stack = [];
    this._errStack = [];
  }

  //todo: overload
  use(middleware: any): this {
    this._stack.push(middleware);
    if (isArray(middleware)) {
      this._stack = _.flatten(this._stack);
    }

    let errStack = this._errStack;
    const prevLength = errStack.length;
    this._stack.forEach((fn): void => {
      if (fn.length > 3) errStack.push(fn);
    });

    if (errStack.length > prevLength) {
      this._stack = _.without.apply(_, [this._stack].concat(errStack));
    }
    return this;
  };

  onResponder(responder: Responder): void {
    const self = this;
    const request = responder.originalMessage.payload;
    const response = new ResponderResponse(responder);

    async.applyEachSeries(this._stack, request, response, (err): void => {
      if (!err) return;
      if (!self._errStack.length) return self._errorHandler(request, response, err);
      async.applyEachSeries(self._errStack, err, request, response, self._errorHandler.bind(null, request, response, err));
    });
  };

  listen(channelManager?: any): this {
    if (this.emitter) throw new Error("Already listening");

    this.emitter = Responder.createEmitter(this.config, channelManager);
    this.emitter.on("responder", this.onResponder.bind(this));
    return this;
  };

  close(): void {
    if (!this.emitter) throw new Error("Not listening");

    this.emitter.end();
    delete(this.emitter);
  };

  _errorHandler(request: any, response: any, err: any, ultimateErr?: any): void {
    err = ultimateErr || err;
    response.writeHead(err.statusCode || 500);
    response.end();
  }
}
