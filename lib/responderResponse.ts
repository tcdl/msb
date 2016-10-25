export class ResponderResponse {
  responder: any;
  body: any;
  _hasBody: boolean;
  _header: any;
  statusCode: number;
  statusMessage: string;

  private headers: {
    [key: string]: string;
  };

  constructor(responder) {
    this.responder = responder;
    this.body = null;
    this.headers = null;
  }

  setHeader(name: string, value: string): void {
    this.headers[name] = value;
  }

  getHeader(name: string): string {
    return this.headers[name];
  }

  removeHeader(name: string): void {
    delete this.headers[name];
  }

  writeHead(statusCode: number, headers?: any): void {
    //tbd
  }

  end(body, cb) {
    if (!cb && typeof body === "function") {
      cb = body;
      body = this.body;
    } else {
      body = body || this.body;
    }

    if (!this._header) {
      this.writeHead(this.statusCode);
    }

    var payload: any = {
      statusCode: this.statusCode,
      body: null
    };

    if (this._header) {
      payload.headers = this._header;
    }

    if (body && this._hasBody) {
      if (body instanceof Buffer) {
        payload.bodyBuffer = body.toString("base64");
      } else {
        payload.body = body;
      }
    }
    return this.responder.send(payload, cb);
  };

}
