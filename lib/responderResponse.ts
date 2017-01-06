import {Responder} from "./responder";

export class ResponderResponse {
  responder: Responder;
  body: any;
  _hasBody: boolean;
  _header: any;
  statusCode: number;

  private headers: {
    [key: string]: string;
  };

  constructor(responder: Responder) {
    this.responder = responder;
    this.body = null;
    this.headers = {};
    this._hasBody = (responder.originalMessage.payload.method === "HEAD") ? false : true;
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

  writeHead(statusCode: number, headers?: {[key: string]: string; }): void {
    this.statusCode = statusCode;
    if (statusCode === 204) {
      this._hasBody = false;
    }
    const mainHeaders = Object.keys(this.headers);
    if (mainHeaders.length) {
      this._header = {};
      Object.keys(this.headers).forEach((key) => {
        this._header[key] = this.headers[key];
      });
    }

    if (headers) {
      this._header = this._header || {};
      Object.keys(headers).forEach((key) => {
        this._header[key] = headers[key];
      });
    }
  }

  end(body: any, cb?: Function): void {
    if (!cb && typeof body === "function") {
      cb = body;
      body = this.body;
    } else {
      body = body || this.body;
    }

    if (!this._header) {
      this.writeHead(this.statusCode || 200);
    }

    const payload: any = {
      statusCode: this.statusCode,
      body: null,
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
    this.responder.send(payload, cb);
  };

}
