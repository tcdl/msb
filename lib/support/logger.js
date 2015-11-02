'use strict';

/**
 * Logs warnings when not in production
 */
exports.warn = function(msg) {
  console.error('WARNING: ' + msg);
};
