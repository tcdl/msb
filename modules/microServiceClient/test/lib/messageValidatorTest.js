'use strict';
var test = require('tape');
var messageValidator = require('./../../lib/messageValidator.js');
var os = require('os');

test('Message Validator Tests', function (g) {
    g.test('I should be possible to pass a message validation', function (t){
        var msg = require('./../fixtures/validMessage.json');
        messageValidator.validate(msg,function(err,result){
            t.error(err, result)
            t.end();
        });
    });

    g.test('I should be possible to get a validation error', function (t){
        var msg = require('./../fixtures/noMessageIdMessage.json');
        messageValidator.validate(msg,function(err,result){
            t.equal(err.message, 'id is required')
            t.end();
        });
    });

    g.end();
});
