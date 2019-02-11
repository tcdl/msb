var _ = require('lodash');
var STOMPPublisherAdapter = require('./publisher').STOMPPublisherAdapter;
var STOMPSubscriberAdapter = require('./subscriber').STOMPSubscriberAdapter;
var stompit = require('stompit');
var EventEmitter = require('events').EventEmitter;

var activemq = exports;

activemq._createConnection = function(config) {
  var connectOptions = {
    // 'host': '172.28.23.93',
    'host': 'localhost',
    'port': 61613,
    'connectHeaders':{
      'host': '/',
      'login': 'admin',
      'passcode': 'admin',
      'heart-beat': '5000,5000'
    }
  };

  // stompit.connect(connectOptions, function(error, client) {
  //
  //   console.log('connect stompit');
  //
  //   if (error) {
  //     console.log('connect error ' + error.message);
  //     return callback(error);
  //   }
  //
  //   return callback(null, client);
  // });
  return stompit.connect(connectOptions);
};

activemq.create = function() {
  var adapter = new EventEmitter();
  var client;
  // var connection;
  var closed;

  //
  // adapter.Publish = function(config, callback) {
  //
  //   sharedClient(config, function (err, client) {
  //     var publisher = new STOMPPublisherAdapter(config, client);
  //
  //     // TODO understand what is this
  //     var result = {
  //       channel: function(topic) {
  //         return {
  //           publish: publisher.publish.bind(publisher, topic),
  //           close: publisher.close.bind(publisher)
  //         };
  //       }
  //     };
  //     return callback(err, result);
  //   });
  //
  //
  // };

  adapter.Publish = function(config) {
    var publisher = new STOMPPublisherAdapter(config, sharedClient(config));

    return {
      channel: function(topic) {
        return {
          publish: publisher.publish.bind(publisher, topic),
          close: publisher.close.bind(publisher)
        };
      }
    };
  };

  // adapter.Subscribe = function(config) {
  //   sharedClient(config, function (err, client) {
  //     return new STOMPSubscriberAdapter(config, client);
  //   });
  // };

  adapter.Subscribe = function(config) {
    return new STOMPSubscriberAdapter(config, sharedClient(config));
  };

  adapter.close = function() {
    if (!client) return;
    closed = true;
    client.disconnect();
  };

  // function sharedConnection(config) {
  //   if (connection) return connection;
  //
  //
  //   connection = stompit._createConnection(_.clone(config), );
  //   connection.setMaxListeners(0);
  //   connection.on('ready', function() {
  //     adapter.emit('connection');
  //   });
  //   connection.on('close', function(e) {
  //     if (closed) {
  //       adapter.emit('close', e);
  //       return;
  //     }
  //     if (config.reconnect) {
  //       adapter.emit('disconnection', e);
  //     } else {
  //       adapter.emit('error', e);
  //     }
  //   });
  //   connection.on('error', function(e) {
  //     adapter.emit('error', e);
  //   });
  //   return connection;
  // }

  function sharedClient(config) {
    if (client) return client;


    client = activemq._createConnection(_.clone(config));

    client.on('connect', function() {
      adapter.emit('connection');
    });

      // client.setMaxListeners(0); // NOTE stompit does not have setMaxListeners in docs. TODO find out if we need it
      // Although it has channel pool and maxChannels http://gdaws.github.io/node-stomp/api/channel-pool/


      // TODO reconnect logic should be here
      // We need to use stompit.ConnectFailover for reconnect
    client.on('close', function(e) {
      if (closed) {
        adapter.emit('close', e);
        return;
      }
      if (config.reconnect) {
        adapter.emit('disconnection', e);
      } else {
        adapter.emit('error', e);
      }
    });
    client.on('error', function(e) {
      adapter.emit('error', e);
    });
    return client;
  }

  return adapter;
};



// ****

/*
var connectOptions = {
  // 'host': '172.28.23.93',
  'host': 'stomp+ssl://b-1ba48aa9-88fa-47e7-b573-86e946fb68aa-1.mq.us-east-2.amazonaws.com',
  'port': 61614,
  'connectHeaders':{
    'host': '/',
    'login': 'admin1',
    'passcode': 'admin1admin2',
    'heart-beat': '5000,5000'
  }
};

stompit.connect(connectOptions, function(error, client) {

  console.log('connect ' + process.env.CLIENT2);

  if (error) {
    console.log('connect error ' + error.message);
    return;
  }

  var sendHeaders = {
    'destination': '/topic/VirtualTopic.Test',
    'content-type': 'text/plain'
  };

  var frame = client.send(sendHeaders);
  frame.write('hello');
  frame.end();

  var subscribeHeaders1 = {
    'destination': '/queue/Consumer.A.VirtualTopic.Test',
    'ack': 'client-individual'
  };

  var subscribeHeaders2 = {
    'destination': '/queue/Consumer.B.VirtualTopic.Test',
    'ack': 'client-individual'
  };

  var subscribeHeaders = process.env.CLIENT2 ? subscribeHeaders2 : subscribeHeaders1;

  client.subscribe(subscribeHeaders, function(error, message) {

    if (error) {
      console.log('subscribe error ' + error.message);
      return;
    }

    message.readString('utf-8', function(error, body) {

      if (error) {
        console.log('read message error ' + error.message);
        return;
      }

      console.log('received message: ' + body);

      client.ack(message);

      // client.disconnect();
    });
  });
});

//*/
