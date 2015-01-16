'use strict';
var test = require('tape');
var message = require('./../../lib/message.js')();
var uniqueIdGen = require('./../../lib/message.js')();

test('Message Tests', function (g) {
    g.test('I should be possible to create a new message', function (t){
        var topic = 'fooTopic'; //sample topic
        var req = {
            topic : topic,
            metadata: {
                signature : {
                    serviceId : 1
                }
            },
            headers: {
                'x-siteId' : 'tcuk'
            },
            query: {
                q : 'Summer holiday in spain in august'
            },
            params: {
                param1 : 'foo',
                param2 : 'foo'
            },
            body: {
                foo : 'foo1'
            }
        };
        message.createMessage(req,{reqres:true},function(err,result){
            t.deepEqual(result.req,req, 'request is ok');
            t.deepEqual(result.res,{ statusCode: 500, headers: {}, body: null }, 'response is ok')
            t.end();
        });
    });

    g.test('I should be possible to create a new message and get an topic error back', function (t){
        var topic = 'fooTopic'; //sample topic
        var req = {
        };
        message.createMessage(req,{reqres:true},function(err,result){
            t.equal(err.message,'topic must be a string', 'Topic error is expected, as no topic is provided');
            t.equal(result,null, 'No result should be given');
            t.end();
        });
    });

    g.end();
});
