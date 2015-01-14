/**
 */

var msClient = {};
var extend = require('util')._extend;
var uniqueIdGen = require('./../lib/uniqueIdGen');
var mq = require('message-queue');
var Joi = mq.Joi;


msClient._queue = null;

/**
 * see init(opts) for details
 * @private
 */
msClient._opts = {
    mqType : 'redis',
    serviceId : uniqueIdGen.getUniqueId(),
    producedMessageTTL : 60
};

/**
 * Array off registered consumers
 * @type {Array}
 * @private
 */
msClient._consumers = [];

/**
 * Producer
 * @private
 */
msClient._producer = null;

/**
 * Initialise the microServiceClient, it uses the default configuration,
 * but can be overridden by passing an opts object.
 *
 * opts:
 *   port : the ip address to connect to the mq
 *   ip : the ip address to connect to the mq
 *   serviceId : used to see if consumed messages are produced by this service, default a unique id is generated
 */
msClient.init = function init(opts){
    opts = opts || {};
    //override default config if new config is given
    msClient._opts.port =  opts.port || msClient._opts.port;
    msClient._opts.ip =  opts.ip || msClient._opts.ip;
    msClient._opts.serviceId  = opts.serviceId || msClient._opts.serviceId;

    //Create an mq client
    msClient._queue = mq('redis');

    //create a redis client to produce new messages
    msClient._producer = msClient._queue.Publish();
};

/**
 * Create a new consumer for a given topic, a cb function has to be provided, which will be triggered on each message
 * Currently only consumes self produced JSON messages !!!!
 * @param topic : topic to listen on e.g. "search.facetparser.v1"
 * @param opts : {
 *   ownProducedMessagesOnly : only give a callback for own produced messages
 *
 *   }
 * @param cb
 */
msClient.consume = function consume(topic, opts, cb){

    var consumer = redis.createClient(msClient._opts.port, msClient._opts.ip, {});
    consumer.__tc = {
        cb : cb,
        topic : topic,
        opts : opts
    };

    //Add the consumer to the list of active consumers
    msClient._consumers.push(consumer);

    consumer.on("subscribe", function (channel, count) {
        consumer.__tc.cb(null,{
            event : 'subscribed',
            topic : channel,
            message : null
        });
    });

    //Start Listening on messages
    consumer.on("message", function (channel, message) {
        msClient._processConsumedMessage(channel, message, consumer.__tc.cb);
    });

    if (opts.ownProducedMessagesOnly){
        consumer.subscribe(topic +'.RES.' + msClient._opts.serviceId);
    } else
    {
        consumer.subscribe(topic +'.RES');
    }
};

/**
 * Produce a new message on a given topic
 * @param topic : topic to produce on "search.facetparser.v1"
 * @param opts : {
 *   reqres : true/false --> when true, add a response topic
 *   }
 * @param req : the request
 * @param cb : function(err)
 */
msClient.produce = function produce(topic, opts, req, cb){
    var message = {};
    message.id = message.id || msClient._getNewMessageId();
    message.metadata = message.metadata || {};
    message.metadata.timer = {};
    message.metadata.timer.start = msClient._startTimer();
    message.topic = topic
    if (opts.reqres){
        message.responseTopic = topic + '.RES.' + msClient._opts.serviceId;
    }
    else{
        message.responseTopic = topic;
    }
    message.req = req || {};
    message.res = {
        statusCode : null,
        headers : {},
        body : null
    };

    //publish
    msClient._producer.publish(topic,JSON.stringify(message),function(err, items){
        if (err){
            return cb(err);
        }
        //Return the messageId
        cb(err,message);
    });
};

/**
 * Create a new unique message Id
 * @returns messageId {string}
 * @private
 */
msClient._getNewMessageId = function(){
    return msClient._opts.serviceId + '.' + uniqueIdGen.getUniqueId();
};

/**
 * Process a consumed message, transform to JSON and See if the message was produced by this client
 * @param consumer
 * @param channel
 * @param message
 * @private
 */
msClient._processConsumedMessage = function(channel, message, cb){
    //Parse the message
    // parse the message, when fails
    try {
        jsonMessage = JSON.parse(message);
    }
    catch(err){
        if (typeof msClient.onConsumeMessageError == 'function'){
            msClient.onConsumeMessageError({channel:channel, message:message, error : err});
        }
    }
    //Add the duration for the message in ms
    jsonMessage.metadata.timer.duration = msClient._stopTimer(jsonMessage);

    var result = {
            event : 'message',
            topic : channel,
            message : jsonMessage
        };

        if (typeof msClient.onConsumeMessage == 'function'){
            msClient.onConsumeMessage(result);
        }
        return cb(null,result);
};


/**
 * Starts a high resolution operating system timer
 * @return {Array} An array of [number, number] representing the time in [whole seconds, the nanoseconds remainder]
 */
msClient._startTimer = function startTimer() {
    return process.hrtime();
};

/**
 * Computes the delta between now and a `startTimer()` call
 * using a high resolution timer.
 * @param  {Array} start a result from `startTimer()`
 * @return {number}       The time delta in whole milliseconds
 */
msClient._stopTimer = function stopTimer(message) {
    var start = message.metadata.timer.start; //TODO safely get the start
    var end = process.hrtime(start);
    return parseInt(((end[0] + end[1] / 1e9) * 1e3), 10);
};

/**
 * Shutdown all Redis Connections
 */
msClient.shutDown = function(){
    msClient._producer.end();
    msClient._producedMessageIdsRedisClient.end();
    msClient._consumers.forEach(function(consumer){
        consumer.client.end();
    });
    msClient._consumers = [];
};

function init(opts){
    msClient.init(opts || {});
    return msClient;
}

module.exports = init();

