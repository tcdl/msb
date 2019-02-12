var expect = require('chai').expect;

var message = messageFactory.createBroadcastMessage({
  namespace: 'test:pubsub',
  ttl: 30000 // Optional
})

message.payload = { /* ... */ }
