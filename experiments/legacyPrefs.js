/*
Retrieve legacy preferences with WebEstension Experiment. Adapted from
https://github.com/thundernest/sample-extensions
*/

// Get various parts of the WebExtension framework that we need.
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// This is the base preference name for all the legacy prefs.
const MY_EXTENSION_BASE_PREF_NAME = "extensions.sendlater3.";

var legacyPrefs = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      legacyPrefs: {
        async getPref(name, dtype) {
          try {
            switch (dtype) {
              case "bool": {
                return Services.prefs.getBoolPref(`${MY_EXTENSION_BASE_PREF_NAME}${name}`);
              }
              case "int": {
                return Services.prefs.getIntPref(`${MY_EXTENSION_BASE_PREF_NAME}${name}`);
              }
              case "char": {
                return Services.prefs.getCharPref(`${MY_EXTENSION_BASE_PREF_NAME}${name}`);
              }
              case "string": {
                return Services.prefs.getStringPref(`${MY_EXTENSION_BASE_PREF_NAME}${name}`);
              }
            }
          } catch (ex) {
            return undefined;
          }
          throw new Error("Unexpected pref type");
        },
      },
    };
  }
};
