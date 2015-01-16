'use strict';

var assert = require('assert');
var msClient = require('./../../lib/msClient.js');
var redis = require('redis');
var producer = redis.createClient();
var consumer = redis.createClient();
var consumers = {};

consumer.on("subscribe", function (channel, count) {
    //console.log('consumer subscribed on : ' + channel)
});
//Start Listening on messages
consumer.on("message", function (channel, message) {
    if (typeof consumers[channel] ==  "function"){
        consumers[channel](channel, message);
    }
});

//Initialise the client with defaults
msClient.init();

describe('MicroService Client Tests ', function () {
    it('It should be possible to publish a message', function (done) {
        var channel = "test_1";
        consumer.subscribe(channel);
        var req = {
            headers : {},
            body :{},
            query : {
                q : 'Familly holiday from brussels to spain next christmas'
            }
        };
        var msg = null;
        consumers[channel] = function(channel,message){
            message = JSON.parse(message);
            console.log(message);
            assert(msg.id == message.id);
            delete consumers[channel];
            consumer.unsubscribe(channel);
            done();
        };
        msClient.produce(channel,{reqres:true},req,function(err, result){
            msg = result;
        });
    });
});