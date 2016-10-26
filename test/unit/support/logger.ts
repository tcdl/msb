import {expect} from "chai";
import {warn} from "../../../lib/support/logger";
const simple = require("simple-mock");

describe("logger", function () {

  afterEach(function (done) {
    simple.restore();
    done();
  });

  describe("warn()", function () {
    it("should log error to console", function (done) {
      simple.mock(console, "error").returnWith();

      warn("abc");

      expect((console.error as any).calls).length(1);
      expect((console.error as any).lastCall.arg).equals("WARNING: abc");

      done();
    });
  });
});
