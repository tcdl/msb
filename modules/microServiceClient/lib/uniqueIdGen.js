/**
 * Create a unique identifier
 * a datacenter, worker can be given to create a prefix on the generated id
 *
 * the Flake ID is made up of: timestamp, datacenter, worker and counter
 *
 * see : https://www.npmjs.com/package/flake-idgen for more details
 *
 */

var FlakeId = require('flake-idgen');
var intformat = require('biguint-format');

var uniqueIdGen = {};

uniqueIdGen._defaults = {
    datacenter: 1,
    worker:1
};

/**
 * @param {Number} datacenter - Datacenter identifier. It can have values from 0 to 31.
 * @param {Number} worker - Worker identifier. It can have values from 0 to 31.
 */
uniqueIdGen.init = function(datacenter, worker){
    var opts = {
        datacenter: datacenter || uniqueIdGen._defaults.datacenter,
        worker: worker || uniqueIdGen._defaults.worker
    };
    uniqueIdGen._flakeIdGen = new FlakeId(opts);
};

uniqueIdGen.getUniqueId = function getUniqueId(){
    if (!uniqueIdGen._flakeIdGen){
      uniqueIdGen._flakeIdGen = new FlakeId(uniqueIdGen._defaults);
    }
    return  intformat(uniqueIdGen._flakeIdGen.next(), 'dec');
};

module.exports = uniqueIdGen;



