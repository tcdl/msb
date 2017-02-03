
// TODO: don't export internal classes
const channelManagerObject = require("./lib/channelManager");
export const createChannelManager = channelManagerObject.create;
export const channelManager = channelManagerObject.default;
export const configure = channelManagerObject.default.configure;
export let messageFactory = require("./lib/messageFactory");
export {Collector} from "./lib/collector";
export {Requester} from "./lib/requester";
export {Responder} from "./lib/responder";
export {default as request} from "./lib/request";
export let validateWithSchema = require("./lib/validateWithSchema");
export let serviceDetails = require("./lib/support/serviceDetails");
export let logger = require("./lib/support/logger");
export let plugins = {};

// export API functions
export {publisher} from "./lib/api/utils";
export {subscriber} from "./lib/api/utils";

try {
  require("msb-newrelic");
} catch (e) {
}
try {
  require("msb-loggly");
} catch (e) {
}
