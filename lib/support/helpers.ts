const VALID_TOPIC_REGEX = /^_?([a-z0-9\-]+\:)+([a-z0-9\-]+)$/;

export function validatedTopic(topic: string): string {
  if (VALID_TOPIC_REGEX.test(topic)) return topic;
  throw new Error(`'${topic}' must be an alpha-numeric, colon-delimited string`);
}

export function topicWithoutInstanceId(topic: string): string {
  return topic.replace(/\:[a-f0-9]+$/, "");
}
