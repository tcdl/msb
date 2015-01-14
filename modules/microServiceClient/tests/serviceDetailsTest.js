'use strict';

var assert = require('assert');
var serviceDetails = require('./../lib/serviceDetails.js');
var os = require('os');

describe('Service Details Tests ', function () {
    it('It should be possible to get the details of the service', function (done) {
        var sd = serviceDetails.getSignature('foo');
        assert(sd.hostname, os.hostname);
        assert(sd.processId > 0);
        assert(sd.service,'foo');
        assert(sd.ip.split('.').length == 4);
        console.log(sd);
        done()
    });
});