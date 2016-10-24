"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var tv4_1 = require("tv4");
var SchemaValidationError = (function (_super) {
    __extends(SchemaValidationError, _super);
    function SchemaValidationError(result, msbMessage) {
        _super.call(this);
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
        this.stack = this.stack.replace("\n", "\n " + this.traceErrors(result.errors));
    }
    SchemaValidationError.prototype.toJSON = function () {
        return {
            type: this.name,
            details: {
                errors: this.flatErrorDetails(this.details.errors, []),
                missing: this.details.missing
            }
        };
    };
    SchemaValidationError.prototype.flatErrorDetails = function (errors, arr) {
        arr = arr || [];
        var i = 0;
        var error;
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
    };
    SchemaValidationError.prototype.traceErrors = function (errors) {
        var _this = this;
        var str = "";
        errors.reverse().forEach(function (err) {
            if (err.subErrors) {
                str += _this.traceErrors(err.subErrors);
            }
            str += " at " + err.dataPath + " " + err.message + " \n";
        });
        return str;
    };
    return SchemaValidationError;
}(Error));
var ValidateWithSchema = (function () {
    function ValidateWithSchema() {
    }
    ValidateWithSchema.prototype.middleware = function (schema) {
        return function (request, response, next) {
            try {
                this.validateWithSchema(schema, request);
            }
            catch (e) {
                next(e);
                return;
            }
            next();
        };
    };
    ValidateWithSchema.prototype.onEvent = function (schema, successHandlerFn, errorHandlerFn) {
        var self = this;
        return function (message) {
            try {
                self.validateWithSchema(schema, message);
            }
            catch (e) {
                if (errorHandlerFn) {
                    errorHandlerFn(e, message);
                }
                else {
                    this.emit("error", e, message);
                }
                return;
            }
            successHandlerFn.apply(this, arguments);
        };
    };
    ValidateWithSchema.prototype.validateWithSchema = function (schema, message) {
        var result = tv4_1.validateMultiple(message, schema);
        if (result.valid)
            return;
        throw new SchemaValidationError(result, message);
    };
    return ValidateWithSchema;
}());
module.exports = new ValidateWithSchema();
