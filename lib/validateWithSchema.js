var tv4 = require('tv4');
var util = require('util');

/**
 * A method that will throw a standard error containing validation results
 * @param  {Object} obj     the parsed JSON object
 * @param  {Object} schema  JSON-schema object
 */
var validateWithSchema = module.exports = function(message, schema) {
  var result = tv4.validateMultiple(message, schema);
  if (result.valid) return;

  throw new SchemaValidationError(result, message);
};

/**
 * Return a req/res/next middleware validating the request with error passed to next
 * @param  {Object} schema
 * @return {Function}
 */
validateWithSchema.middleware = function(schema) {
  return function(request, response, next) {
    try {
      validateWithSchema(schema, request);
    } catch (e) {
      next(e);
      return;
    }
    next();
  };
};

/**
 * Generate a function that will validate and safely emit the error on the same emitter
 * @param  {Object} schema
 * @param  {Function} successHandlerFn
 * @return {Function}
 */
validateWithSchema.onEvent = function(schema, successHandlerFn) {
  return function(message) {
    try {
      validateWithSchema(schema);
    } catch (e) {
      this.emit('error', e);
      return;
    }
    successHandlerFn(message);
  };
};

/**
 * A custom error containing detailed information and status code
 * @param {Object} result   the tv4 result or similar
 */
function SchemaValidationError(result, source) {
  this.name = 'SchemaValidationError';
  this.statusCode = 422;
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
}

util.inherits(SchemaValidationError, Error);

SchemaValidationError.prototype.toJSON = function() {
  return {
    type: this.name,
    details: {
      errors: _errorDetails(this.details.errors),
      missing: this.details.missing
    }
  };
};

function _errorDetails(errors, arr) {
  arr = arr || [];
  var i = 0;
  var error;
  while (i < errors.length) {
    error = errors[i++];
    arr.push({
      message: error.message,
      params: error.params,
      dataPath: error.dataPath,
      schemaPath: error.schemaPath
    });
    if (error.subErrors) {
      _errorDetails(error.subErrors, arr);
    }
  }
  return arr;
}
