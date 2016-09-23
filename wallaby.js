module.exports = function() {
  return {
    files: [
      'lib/**/*.js',
      'test/**/**.json',
      'index.js',
      'schema.json'
    ],
    tests: [
      'test/**/*.js'
    ],
    env: {
      type: 'node',
      runner: 'node',
      params: {
        env: 'NODE_ENV=test;'
      }
    },
    testFramework: 'mocha'
  };
};
