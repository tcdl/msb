"use strict";
var chai_1 = require("chai");
var generateId = require("../lib/support/generateId");
var _ = require("lodash");
var simple = require("simple-mock");
var MAX_PER_SECOND = 65536;
// NOTE: Requires lodash@2.n as version 3 will time out on performing `_.uniq()` operation.
describe.only("generateId", function () {
    afterEach(function (done) {
        simple.restore();
        done();
    });
    it("generates ordered ids", function (done) {
        var ids = [];
        while (ids.length < 10000) {
            ids.push(generateId());
        }
        chai_1.expect(ids.length).equals(10000);
        chai_1.expect(ids.join()).equals(ids.sort().join());
        done();
    });
    it("works with constant date", function (done) {
        var constantDate = Date.now() + 1000;
        var ids = [];
        simple.mock(Date, "now", function () {
            return constantDate;
        });
        while (ids.length < MAX_PER_SECOND) {
            ids.push(generateId());
        }
        chai_1.expect(ids.length).equals(MAX_PER_SECOND);
        chai_1.expect(ids.length).equals(_.uniq(ids).length);
        done();
    });
    it("works with failure of randomness", function (done) {
        var constantDate = Date.now() + 1000;
        simple.mock(Date, "now", function () {
            return constantDate;
        });
        simple.mock(Math, "random", function () {
            return 0;
        });
        var ids = [];
        while (ids.length < MAX_PER_SECOND) {
            ids.push(generateId());
        }
        chai_1.expect(ids.length).equals(MAX_PER_SECOND);
        chai_1.expect(ids.length).equals(_.uniq(ids).length);
        done();
    });
});
