import {expect} from "chai";
import {Builder as PublisherBuilder} from "../../../lib/api/publisher";
import {Builder as SubscriberBuilder} from "../../../lib/api/subscriber";
import * as utils from "./../../../lib/api/utils";

describe("api.utils", () => {

  it("should return a publisher builder", () => {
    // act and arrange
    const builder = utils.publisher("test:topic");
    // assert
    expect(builder).to.be.instanceOf(PublisherBuilder);
  });

  it("should return a subscriber builder", () => {
    // act and arrange
    const builder = utils.subscriber("test:topic");
    // assert
    expect(builder).to.be.instanceOf(SubscriberBuilder);
  });

});
