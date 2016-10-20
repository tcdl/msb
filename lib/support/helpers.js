"use strict";
var VALID_TOPIC_REGEX = /^_?([a-z0-9\-]+\:)+([a-z0-9\-]+)$/;
function validatedTopic(topic) {
    if (VALID_TOPIC_REGEX.test(topic))
        return topic;
    throw new Error("'" + topic + "' must be an alpha-numeric, colon-delimited string");
}
exports.validatedTopic = validatedTopic;
function topicWithoutInstanceId(topic) {
    return topic.replace(/\:[a-f0-9]+$/, "");
}
exports.topicWithoutInstanceId = topicWithoutInstanceId;
