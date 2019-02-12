var stompit = require('stompit');

var connectOptions = {
  // 'host': '172.28.23.93',
  'host': 'stomp+ssl://b-06af7f46-7359-49b7-9124-ac37ea1c1892-1.mq.us-east-2.amazonaws.com',
  'port': 61614,
  'connectHeaders':{
    'host': '/',
    'login': 'admin1',
    'passcode': 'admin1admin2',
    'heart-beat': '5000,5000'
  }
  // 'host': 'localhost',
  // 'port': '61613',
  // 'connectHeaders':{
  //   'host': '/',
  //   'login': 'admin',
  //   'passcode': 'admin',
  //   'heart-beat': '5000,5000'
  // }
};

// var client =
stompit.connect(connectOptions, function(error, client) {
  console.log('connect ', client);

  if (error) {
    console.log('connection error', error)
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
// client.on('connect',

  //
  // if (error) {
  //   console.log('connect error ' + error.message);
  //   return;
  // }
