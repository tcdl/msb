import {validateMultiple, ValidationError, MultiResult, JsonSchema} from "tv4";
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
    this.statusCode = 422;
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

  middleware(schema: JsonSchema): (request: any, response: any, next: Function) => void {
    return (request, response, next): void => {
      try {
        this.validateWithSchema(schema, request);
      } catch (e) {
        next(e);
        return;
      }
      next();
    };
  }

  onEvent(schema: JsonSchema, successHandlerFn: Function, errorHandlerFn?: Function): (message: Message) => void {
    const self = this;
    return function (message: Message): void {
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

  private validateWithSchema(schema: JsonSchema, message: Message): void {
    let result = validateMultiple(message, schema);
    if (result.valid) return;

    throw new SchemaValidationError(result, message);
  }
}

export = new ValidateWithSchema();
