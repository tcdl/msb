import {Publisher} from "./publisher";
import {Subscriber} from "./subscriber";

/**
 * Creates Publisher.Builder class
 * @param topic
 * @returns {Publisher.Builder}
 */
export function publisher(topic) {
  return new Publisher.Builder(topic);
}

/**
 * Creates Subscriber.Builder
 * @param topic
 * @returns {Subscriber.Builder}
 */
export function subscriber(topic) {
  return new Subscriber.Builder(topic);
}
