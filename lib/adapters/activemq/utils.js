'use strict';
var _ = require('lodash');

module.exports.generateDestination = (destination, routingKeys) => {
  var routings = (!routingKeys || routingKeys === '') ? [] : _.isString(routingKeys) ? [routingKeys] : routingKeys;

  if (routings.length === 0) {
    return destination;
  }

  var combinedDestination = '';
  var lastElement = routings.length - 1;

  routings.forEach(function (value, index) {
    combinedDestination = combinedDestination + destination + '.' + value;
    if (index !== lastElement) {
      combinedDestination = combinedDestination + ','
    }
  });

  return combinedDestination;
};
