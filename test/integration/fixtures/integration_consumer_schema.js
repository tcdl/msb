module.exports = {
  type: 'object',
  properties: {
    payload: {
      type: 'object',
      properties: {
        body: { type: 'object' }
      },
      required: ['body']
    }
  }
};
