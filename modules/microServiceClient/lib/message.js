/**
 * create a new message based on a given request
 * the message is validated using the message validator against the Joi message schema
 * a serviceId can be given by initialisation, else a random service id will be generated
 */
var extend = require('util')._extend;
var uniqueIdGen = require('./uniqueIdGen');
var serviceDetails = require('./serviceDetails');
var messageValidator = require('./messageValidator');

var msg = {};

msg._options = {
    serviceId : uniqueIdGen.getUniqueId()
};

/**
 * Create a new message
 * @param req : request
 * @param opt : currently no options defined
 * @param cb : callback function(err,message)
 */
msg.createMessage = function(req, opt, cb){
    //Create a new message object
    var message = {};
    message.id = msg._getNewMessageId();
    //Request
    message.req = {};
    message.req.metadata = req.metadata || {};
    message.req.headers = req.headers || {};
    message.req.query = req.query || {};
    message.req.params = req.params || {};
    message.req.body = req.body || null;
    message.req.topic = req.topic || null;
    if (req.restopic){message.req.restopic = req.restopic}
    //Response
    message.res = {
        statusCode : 500,
        headers : {},
        body : null
    };
    //Parent
    message.parent = {};
    //validate the message format
    messageValidator.validate(message,function(err,result){
       if (err){
           return cb(err,null);
       }
       return cb(null, message)
    });
};

/**
 * Create a new unique message Id
 * @returns messageId {string}
 * @private
 */
msg._getNewMessageId = function(){
    return msg._options.serviceId + '.' + uniqueIdGen.getUniqueId();
};

module.exports = function(options){
    options = options || {};
    msg._options.serviceId = options.serviceId || msg._options.serviceId;
    return msg;
};
