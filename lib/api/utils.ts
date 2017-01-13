import * as publisherModule from "./publisher";
import * as subscriberModule from "./subscriber";

/**
 * Creates Publisher.Builder class
 * @param topic
 * @returns {Publisher.Builder}
 */
export function publisher(topic) {
  return new publisherModule.Builder(topic);
}

/**
 * Creates Subscriber.Builder
 * @param topic
 * @returns {Subscriber.Builder}
 */
export function subscriber(topic) {
  return new subscriberModule.Builder(topic);
}
