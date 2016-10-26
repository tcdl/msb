import {expect} from "chai";
import * as helpers from "../../../lib/support/helpers";

describe("validatedTopic()", function () {
  it("should throw for invalid topics", function (done) {
    const invalidTopics: string[] = [
      "oneword",
      "etc.dotted",
      "etc:_other",
      "etc:other*",
      "etc:Capitalized",
      "etc:unexpected:",
      "etc::double"
    ];

    invalidTopics.forEach(function (topic) {
      expect(function () {
        helpers.validatedTopic(topic);
      }, topic).to.throw(Error, `'${topic}' must be an alpha-numeric, colon-delimited string`);
    });

    done();
  });

  it("should return valid topics", function (done) {
    const validTopics: string[] = [
      "two:words",
      "three:word:s",
      "_private:namespaced",
      "etc:one1",
      "etc1:one",
      "etc:a-b",
      "etc-etc:a"
    ];

    validTopics.forEach(function (topic) {
      let validatedTopic;
      try {
        validatedTopic = helpers.validatedTopic(topic);
      } catch (e) {
        expect(e, topic).to.not.exist;
      }
      expect(validatedTopic).to.equal(topic);
    });

    done();
  });
});

describe("topicWithoutInstanceId()", function () {
  it("should return topics stripped of instance id", function (done) {
    const topics = {
      "without:words": "without:words",
      "with:abc123": "with",
      "simple": "simple",
      "simple:multi:aaa:levels": "simple:multi:aaa:levels",
      "simple:multi:aaa:levels:abc": "simple:multi:aaa:levels"
    };

    Object.keys(topics).forEach(function (topic) {
      let cleanTopic;
      try {
        cleanTopic = helpers.topicWithoutInstanceId(topic);
      } catch (e) {
        expect(e, topic).to.not.exist;
      }
      expect(cleanTopic).to.equal(topics[topic]);
    });

    done();
  });
});
