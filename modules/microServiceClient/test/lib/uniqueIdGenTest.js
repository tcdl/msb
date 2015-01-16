'use strict';

var assert = require('assert');
var uniqueIdGen = require('./../../lib/uniqueIdGen.js');

describe('uniqueIdGen Tests ', function () {
    before(function() {
        uniqueIdGen.init(0,0);
    });

    it('It should be possible to generate 10000 unique ids', function (done) {
        var time = process.hrtime();
        var resultList = {};
        var i = 0;
        for (i = 0; i < 10000; i++) {
            var result = uniqueIdGen.getUniqueId();
            resultList[result] = result;
        }
        assert.equal(Object.keys(resultList).length,10000);
        var diff = process.hrtime(time);
        console.log('benchmark took %d msec', parseInt(((diff[0] + diff[1] / 1e9) * 1e3), 10));
        done();
    });

    it('It should be possible to generate a unique id with a given datacenter and worker id', function (done) {
        var time = process.hrtime();
        uniqueIdGen.init(2,2);
        var id1 = uniqueIdGen.getUniqueId();
        uniqueIdGen.init();
        var id2 = uniqueIdGen.getUniqueId();
        console.log(id2,id1);
        done();
    });
});