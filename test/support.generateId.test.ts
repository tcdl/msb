import {expect} from "chai";
import generateId = require("../lib/support/generateId");
const _ = require("lodash");
const simple = require("simple-mock");
const MAX_PER_SECOND: number = 65536;

// NOTE: Requires lodash@2.n as version 3 will time out on performing `_.uniq()` operation.
describe("generateId", function() {
  afterEach(function(done) {
    simple.restore();
    done();
  });

  it("generates ordered ids", function(done) {
    let ids: string[] = [];

    while (ids.length < 10000) {
      ids.push(generateId());
    }

    expect(ids.length).equals(10000);
    expect(ids.join()).equals(ids.sort().join());
    done();
  });

  it("works with constant date", function(done) {
    let constantDate: number = Date.now() + 1000;
    let ids: string[] = [];

    simple.mock(Date, "now", function() {
      return constantDate;
    });

    while (ids.length < MAX_PER_SECOND) {
      ids.push(generateId());
    }

    expect(ids.length).equals(MAX_PER_SECOND);
    expect(ids.length).equals(_.uniq(ids).length);
    done();
  });

  it("works with failure of randomness", function(done) {
    let constantDate: number = Date.now() + 1000;

    simple.mock(Date, "now", function() {
      return constantDate;
    });

    simple.mock(Math, "random", function() {
      return 0;
    });

    let ids: string[] = [];

    while (ids.length < MAX_PER_SECOND) {
      ids.push(generateId());
    }

    expect(ids.length).equals(MAX_PER_SECOND);
    expect(ids.length).equals(_.uniq(ids).length);
    done();
  });
});
