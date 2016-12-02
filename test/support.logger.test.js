"use strict";
var chai_1 = require("chai");
var logger_1 = require("../lib/support/logger");
var simple = require("simple-mock");
describe("logger", function () {
    afterEach(function (done) {
        simple.restore();
        done();
    });
    describe("warn()", function () {
        it("should log error to console", function (done) {
            simple.mock(console, "error").returnWith();
            logger_1.warn("abc");
            chai_1.expect(console.error.calls).length(1);
            chai_1.expect(console.error.lastCall.arg).equals("WARNING: abc");
            done();
        });
    });
});
