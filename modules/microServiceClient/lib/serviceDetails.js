var os = require('os');
var ip = require('ip');

var serviceDetails = {};

serviceDetails.getSignature = function getSignature(serviceName){
    return  {
        hostname : os.hostname(),
        processId : process.pid,
        service : serviceName,
        ip :ip.address()
    }
};

module.exports = serviceDetails;