/**
* Validate a given message against the Joi message schema
 */

var Joi = require('joi');

var msgSchema = {};

msgSchema._getSchema = function (){
    var schema = Joi.object().keys(
        {
            id : Joi.string().min(1).max(150).required(),
            req : Joi.object().keys({
                metadata : Joi.object(),
                headers : Joi.object(),
                query : Joi.object(),
                params : Joi.object(),
                body : Joi.any(),
                topic : Joi.string().min(1).max(200).required(),
                restopic : Joi.string().min(1).max(200)
            }).required(),
            res : Joi.object().keys({
                statusCode : Joi.number().min(100).max(900).integer(),
                headers : Joi.object(),
                body : Joi.any()
            }).required(),
            parent : Joi.object()
        });
    return schema;
};

msgSchema.validate = function validate(message, cb){
    Joi.validate(message, msgSchema._getSchema(), function (err, value) {
       cb(err,value)
    });
};


module.exports = msgSchema;

