var Contributor = require('../lib/contributor');
var i = 1001;

Contributor.attachListener({
  namespace: 'test.general'
}, function(contributor) {
  contributor.message.res.body = i++;
  contributor.send();
});

