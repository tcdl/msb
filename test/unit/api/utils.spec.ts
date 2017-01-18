import {expect} from "chai";
import * as sinon from "sinon";
import * as utils from "./../../../lib/api/utils";
import {Builder as SubscriberBuilder} from "../../../lib/api/subscriber";
import {Builder as PublisherBuilder} from "../../../lib/api/publisher";

describe("api.utils", () => {

  it("should return publisher builder", () => {
    // act and arrange
    const builder = utils.publisher("test:topic");
    // assert
    expect(builder).to.be.instanceOf(PublisherBuilder);
  });

  it("should return subscriber builder", () => {
    // act and arrange
    const builder = utils.subscriber("test:topic");
    // assert
    expect(builder).to.be.instanceOf(SubscriberBuilder);
  });

});
