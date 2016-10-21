import {validateMultiple, ValidationError, MultiResult} from "tv4";

export class ValidateWithSchema {

  middleware(schema) {
    return function(request, response, next) {
      try {
        this._validateWithSchema(schema, request);
      } catch (e) {
        next(e);
        return;
      }
      next();
    };
  }

  onEvent(schema, successHandlerFn, errorHandlerFn) {
    return function(message) {
      try {
        this._validateWithSchema(schema, message);
      } catch (e) {
        if (errorHandlerFn) {
          errorHandlerFn(e, message);
        } else {
          this.emit('error', e, message);
        }
        return;
      }
      successHandlerFn.apply(this, arguments);
    };
  }

  private _validateWithSchema(schema, message): void {
    let result = validateMultiple(message, schema);
    if (result.valid) return;

    throw new SchemaValidationError(result, message);
  }
}

/**
 * A method that will throw a standard error containing validation results
 *
 * @param  {Object} schema  JSON-schema object
 * @param  {Object} message
 */
//let validateWithSchema:any = module.exports = function(schema, message) {
//  var result = validateMultiple(message, schema);
//  if (result.valid) return;
//
//  throw new SchemaValidationError(result, message);
//};

/**
 * Return a req/res/next middleware validating the request with error passed to next
 *
 * @param  {Object} schema
 * @return {Function}
 */
//validateWithSchema.middleware = function(schema) {
//  return function(request, response, next) {
//    try {
//      validateWithSchema(schema, request);
//    } catch (e) {
//      next(e);
//      return;
//    }
//    next();
//  };
//};

/**
 * Generate a function that will validate and safely emit the error on the same emitter
 *
 * @param  {Object} schema
 * @param  {Function} successHandlerFn
 * @param  {Function} errorHandlerFn
 * @return {Function}
 */
//validateWithSchema.onEvent = function(schema, successHandlerFn, errorHandlerFn) {
//  return function(message) {
//    try {
//      validateWithSchema(schema, message);
//    } catch (e) {
//      if (errorHandlerFn) {
//        errorHandlerFn(e, message);
//      } else {
//        this.emit('error', e, message);
//      }
//      return;
//    }
//    successHandlerFn.apply(this, arguments);
//  };
//};

class SchemaValidationError extends Error {
  name: string;
  message: string;
  statusCode: number;
  details: {
    errors: ValidationError[],
    missing: string[],
    messageId?: any,
    topic?: any
  };

  constructor(result: MultiResult, source: any) {
    super();
    this.name = "SchemaValidationError";
    this.message = "SchemaValidationError";
    this.statusCode = 442;
    this.details = {
      errors: result.errors,
      missing: result.missing
    };

    if (typeof source === 'object') {
      if (source.id) {
        this.details.messageId = source.id;
      }
      if (typeof source.topics === 'object' && source.topics.to) {
        this.details.topic = source.topics.to;
      }
    }

    Error.call(this);
    Error.captureStackTrace(this, arguments.callee);
    this.stack = this.stack.replace('\n', '\n' + this._errorsTrace(result.errors));
  }

  toJSON(): any {
    return {
      type: this.name,
      details: {
        errors: this._errorDetails(this.details.errors, []),
        missing: this.details.missing
      }
    };
  }

  private _errorDetails(errors: ValidationError[], arr: any[]): any[] {
    arr = arr || [];
    let i: number = 0;
    let error;
    while (i < errors.length) {
      error = errors[i++];
      arr.push({
        message: error.message,
        params: error.params,
        dataPath: error.dataPath,
        schemaPath: error.schemaPath
      });
      if (error.subErrors) {
        this._errorDetails(error.subErrors, arr);
      }
    }
    return arr;
  }

  private _errorsTrace(errors: ValidationError[]): string {
    var str = '';
    errors.reverse().forEach(function(err) {
      if (err.subErrors) {
        str += this._errorsTrace(err.subErrors);
      }
      str += '    at ' + err.dataPath + ' ' + err.message + '\n';
    });
    return str;
  }
}

///**
// * A custom error containing detailed information and status code
// *
// * @param {Object} result   the tv4 result or similar
// * @param {Object} source
// */
//function SchemaValidationError(result, source) {
//  this.name = 'SchemaValidationError';
//  this.message = this.name;
//  this.statusCode = 422;
//  this.details = {
//    errors: result.errors,
//    missing: result.missing
//  };
//
//  if (typeof source === 'object') {
//    if (source.id) {
//      this.details.messageId = source.id;
//    }
//    if (typeof source.topics === 'object' && source.topics.to) {
//      this.details.topic = source.topics.to;
//    }
//  }
//
//  Error.call(this);
//  Error.captureStackTrace(this, arguments.callee);
//  this.stack = this.stack.replace('\n', '\n' + _errorsTrace(result.errors));
//}
//
//
//SchemaValidationError.prototype.toJSON = function() {
//  return {
//    type: this.name,
//    details: {
//      errors: _errorDetails(this.details.errors, []),
//      missing: this.details.missing
//    }
//  };
//};
//
//function _errorDetails(errors, arr) {
//  arr = arr || [];
//  var i = 0;
//  var error;
//  while (i < errors.length) {
//    error = errors[i++];
//    arr.push({
//      message: error.message,
//      params: error.params,
//      dataPath: error.dataPath,
//      schemaPath: error.schemaPath
//    });
//    if (error.subErrors) {
//      _errorDetails(error.subErrors, arr);
//    }
//  }
//  return arr;
//}
//
//function _errorsTrace(errors) {
//  var str = '';
//  errors.reverse().forEach(function(err) {
//    if (err.subErrors) {
//      str += _errorsTrace(err.subErrors);
//    }
//    str += '    at ' + err.dataPath + ' ' + err.message + '\n';
//  });
//  return str;
//}

export function validateWithSchema() {return new ValidateWithSchema();}
