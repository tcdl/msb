function STOMPPublisherAdapter(config, client) {
  this.config = config;
  this.client = client;
  this._exchangeByTopic = {};
}

var i= 0;

var publisher = STOMPPublisherAdapter.prototype;

publisher.close = function() {
  // Do nothing
};

publisher.publish = function(topic, message, cb) {
  var messageStr = JSON.stringify(message);
  var routingKey = message.topics && message.topics.routingKey ? message.topics.routingKey : '';

  this._publishMessageStr(topic, messageStr, routingKey, cb);
};

publisher._publishMessageStr = function(topic, messageStr, routingKey, cb) {
  var self = this;

  // this.client.publish(topic, routingKey, messageStr, { deliveryMode: 2, confirm: true }, function(err) {
  //   if (err && err.error && err.error.replyCode === 404) {
  //     return self._ensureExchange(topic, function(err) {
  //       if (err) return cb(err);
  //
  //       self._publishMessageStr(topic, messageStr, routingKey, cb);
  //     });
  //   }
  //   if (err) return cb(err);
  //   cb();
  // });
  var sendHeaders = {
    'destination': '/topic/VirtualTopic.THEGRANDTEST',
    'content-type': 'text/plain'
  };

  // self.client.on('connect', function() {
  //   var frame = self.client.send(sendHeaders);
  //   frame.write(messageStr);
  //   frame.end();
  // });

  if (self.client.connected ) {
    var frame = self.client.send(sendHeaders);
    frame.write(messageStr);
    frame.end();
    console.log('published as is', i++, messageStr);
  } else {
    self.client.on('connect', function() {
      var frame = self.client.send(sendHeaders);
      frame.write(messageStr);
      frame.end();
      //self.client.connected = true;
      console.log('published on connect', i++, messageStr);

    });
  }

  // setTimeout(function () {
  //   var frame = self.client.send(sendHeaders);
  //     frame.write(messageStr);
  //     frame.end();
  // }, 1000)

  try {

  } catch (e) {
    console.log(e);
  }
  
  // console.log('not send');
};

// publisher._ensureExchange = function(topic, cb) {
//   var self = this;
//   var exchange = self.client.exchange({
//     exchange: topic,
//     type: self.config.type
//   });
//
//   exchange.declare(cb);
// };

exports.STOMPPublisherAdapter = STOMPPublisherAdapter;
