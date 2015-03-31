'use strict';
var helpers = exports;

var VALID_TOPIC_REGEX = /^_?([a-z0-9\-]+\:)+([a-z0-9\-]+)$/;

helpers.validatedTopic = function(topic) {
  if (VALID_TOPIC_REGEX.test(topic)) return topic;

  throw new Error('"' + topic + '" must be an alpha-numeric, colon-delimited string');
};

helpers.topicWithoutInstanceId = function(topic) {
  return topic.replace(/\:[a-f0-9]+$/, '');
};
