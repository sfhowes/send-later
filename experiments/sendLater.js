/*
TODO: Lots.
*/

// Get various parts of the WebExtension framework that we need.
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");

var sendLater = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      sendLater: {
        async appName() {
          return Services.appinfo.name;
        },
      },
    };
  }
};
