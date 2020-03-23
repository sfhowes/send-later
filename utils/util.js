var SendLaterUtil = {
  getPref: async function(key) {
    const results = await browser.storage.local.get("preferences");
    return results.preferences[key];
  },
  setPref: async function(key, value) {
    const results = await browser.storage.local.get("preferences");
    let prefs = results.preferences || {};
    prefs[key] = value;
    await browser.storage.local.set({ preferences: prefs });
  },
  getInstanceUuid: async function() {
    // Manually generate UUID -- Surely there is a better way to do this.
    var instance_uuid = await SendLaterUtil.getPref("instance.uuid");
    if (! instance_uuid || instance_uuid == "") {
      instance_uuid = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
      SendLaterUtil.setPref("instance.uuid", instance_uuid);
    }
    return instance_uuid;
  }
};

var SLUtil = SendLaterUtil;
