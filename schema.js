module.exports = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    correlationId: { type: 'string' },
    topics: {
      type: 'object',
      properties: {
        to: { $ref: '#/definitions/topic' },
        ack: { $ref: '#/definitions/topic' },
        response: { $ref: '#/definitions/topic' }
      },
      required: ['to']
    },
    meta: {
      type: 'object',
      properties: {
        createdAt: { type: 'string', format: 'date-time' },
        durationMs: { type: 'number' },
        serviceDetails: { $ref: '#/definitions/serviceDetails' }
      },
      required: ['createdAt']
    }
  },
  required: ['id', 'correlationId', 'meta', 'ack', 'payload'],
  definitions: {
    topic: {
      type: 'string',
      pattern: '^_?([a-z0-9\-]+\:)+([a-z0-9\-]+)$'
    },
    serviceDetails: {
      type: 'object',
      properties: {
        instanceId: { type: 'string' },
        hostname: { type: 'string' },
        ip: {
          type: 'string',
          pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
        },
        pid: { type: 'integer' },
        name: { type: 'string' },
        version: { type: 'string' }
      },
      required: ['name', 'version']
    }
  }
};
