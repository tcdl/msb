import {validateMultiple, ValidationError, MultiResult} from "tv4";
import {Message} from "./messageFactory";

class SchemaValidationError extends Error {
  name: string;
  message: string;
  statusCode: number;
  details: {
    errors: ValidationError[],
    missing: string[],
    messageId?: string,
    topic?: string
  };

  constructor(result: MultiResult, msbMessage: Message) {
    super();
    this.name = "SchemaValidationError";
    this.message = "SchemaValidationError";
    this.statusCode = 442;
    this.details = {
      errors: result.errors,
      missing: result.missing
    };

    if (typeof msbMessage === "object") {
      if (msbMessage.id) {
        this.details.messageId = msbMessage.id;
      }
      if (typeof msbMessage.topics === "object" && msbMessage.topics.to) {
        this.details.topic = msbMessage.topics.to;
      }
    }

    Error.call(this);
    Error.captureStackTrace(this, arguments.callee);
    this.stack = this.stack.replace("\n", `\n ${this.traceErrors(result.errors)}`);
  }

  toJSON(): Object {
    return {
      type: this.name,
      details: {
        errors: this.flatErrorDetails(this.details.errors, []),
        missing: this.details.missing
      }
    };
  }

  private flatErrorDetails(errors: ValidationError[], arr: any[]): any[] {
    arr = arr || [];
    let i: number = 0;
    let error;
    while (i < errors.length) {
      error = errors[i++];
      arr.push({
        message: error.message,
        //params: error.params,
        dataPath: error.dataPath,
        schemaPath: error.schemaPath
      });
      if (error.subErrors) {
        this.flatErrorDetails(error.subErrors, arr);
      }
    }
    return arr;
  }

  private traceErrors(errors: ValidationError[]): string {
    let str = "";
    errors.reverse().forEach((err) => {
      if (err.subErrors) {
        str += this.traceErrors(err.subErrors);
      }
      str += ` at ${err.dataPath} ${err.message} \n`;
    });
    return str;
  }
}

class ValidateWithSchema {

  middleware(schema) {
    return function(request, response, next) {
      try {
        this.validateWithSchema(schema, request);
      } catch (e) {
        next(e);
        return;
      }
      next();
    };
  }

  onEvent(schema, successHandlerFn, errorHandlerFn) {
    const self = this;
    return function(message) {
      try {
        self.validateWithSchema(schema, message);
      } catch (e) {
        if (errorHandlerFn) {
          errorHandlerFn(e, message);
        } else {
          this.emit("error", e, message);
        }
        return;
      }
      successHandlerFn.apply(this, arguments);
    };
  }

  private validateWithSchema(schema, message): void {
    let result = validateMultiple(message, schema);
    if (result.valid) return;

    throw new SchemaValidationError(result, message);
  }
}

export = new ValidateWithSchema();
