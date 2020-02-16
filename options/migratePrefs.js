/*
Migrate legacy preferences to local storage. Adapted from
https://github.com/thundernest/sample-extensions
*/

// This variable can be incremented for future migrations
const currentLegacyMigration = 1;

async function migratePrefs(prefDefaults) {
  const results = await browser.storage.local.get("preferences");

  const currentMigration =
    results.preferences && results.preferences.migratedLegacy
      ? results.preferences.migratedLegacy
      : 0;

  if (currentMigration >= currentLegacyMigration) {
    return;
  }

  let prefs = results.preferences || {};

  if (currentMigration < 1) {
    for (const prefName of Object.getOwnPropertyNames(prefDefaults)) {
      var prefType = prefDefaults[prefName][0];
      prefs[prefName] = await browser.legacyPrefs.getPref(prefName,prefType);
      if (prefs[prefName] === undefined) {
        prefs[prefName] = prefDefaults[prefName][1];
      }
    }
  }

  prefs.migratedLegacy = currentLegacyMigration;
  await browser.storage.local.set({ preferences: prefs });
}

async function doMigratePrefs() {
  const defaultPrefs = await fetch('/options/defaultPrefs.json').then(
    prefTxt => prefTxt.json()
  );

  await migratePrefs(defaultPrefs);
  const results = await browser.storage.local.get();
  if (results["logging.console"] == "Trace") {
    Object.entries(results).forEach(([key, value]) => {
      console.log(key, value);
    });
  }
}

doMigratePrefs().catch(console.error);
