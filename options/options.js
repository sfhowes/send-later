/*
Store the currently selected settings using browser.storage.local.
*/
async function storeSettings() {
  const results = await browser.storage.local.get("preferences");
  let prefs = results.preferences || {};

  var inputs = document.getElementsByClassName("preference");
  for (var i=0; i<inputs.length; i++) {
    var e = inputs[i];
    if (e.tagName == "INPUT") {
      switch (e.type) {
        case "number":
        case "text":
          prefs[e.id] = e.value;
          break;
        case "checkbox":
          prefs[e.id] = e.checked;
          break;
        default:
          console.error("Unexpected input type: "+input.type);
          break;
      }
    } else if (e.tagName == "SELECT") {
      prefs[e.id] = e.value;
    } else {
      console.error("Unexpected tag with 'preference' class: "+e.tagName);
    }
  }

  await browser.storage.local.set({ preferences: prefs });

  if (["debug","trace","all"].includes(prefs["logging.console"])){
    Object.entries(prefs).forEach(([key, value]) => {
      console.log(key, value);
    });
  }
}

/*
Update the options UI with the settings values retrieved from storage,
or the default settings if the stored settings are empty.
*/
function updateUI(restoredSettings) {
  // Replace the option label defaults by their localized equivalents.
  var labels = document.getElementsByClassName('option-label');
  for(var i = 0; i < labels.length; i++) {
    var e = labels[i];
    var localized = browser.i18n.getMessage(e.id);
    if (localized != null) {
      e.textContent = localized;
    }
  }

  // Also localize the save & reset buttons
  var localized = browser.i18n.getMessage("saveOptionsLabel");
  if (localized != null) {
    document.querySelector("#save-button").value = localized;
  }
  var localized = browser.i18n.getMessage("resetOptionsLabel");
  if (localized != null) {
    document.querySelector("#reset-button").value = localized;
  }

  // Now set the input element contents to match user prefs
  var inputs = document.getElementsByClassName("preference");
  for (var i=0; i<inputs.length; i++) {
    var e = inputs[i];
    if (e.tagName == "INPUT") {
      switch (e.type) {
        case "number":
        case "text":
          e.value = restoredSettings.preferences[e.id];
          break;
        case "checkbox":
          e.checked = restoredSettings.preferences[e.id];
          break;
        default:
          console.error("Unexpected input type: "+input.type);
          break;
      }
    } else if (e.tagName == "SELECT") {
      e.value = restoredSettings.preferences[e.id];
    } else {
      console.error("Unexpected tag with 'preference' class: "+e.tagName);
    }
  }
}

async function restoreDefaults() {
  const results = await browser.storage.local.get("preferences");
  let prefs = results.preferences || {};

  const prefDefaults = await fetch('/options/defaultPrefs.json').then(
    prefTxt => prefTxt.json()
  );

  for (const prefName of Object.getOwnPropertyNames(prefDefaults)) {
    prefs[prefName] = prefDefaults[prefName][1];
  }

  await browser.storage.local.set({ preferences: prefs });
  updateUI({ preferences: prefs });
}

/*
On opening the options page, fetch stored settings and update the UI with them.
*/
const gettingStoredSettings = browser.storage.local.get("preferences");
gettingStoredSettings.then(updateUI, console.error);

/*
On clicking the save button, save the currently selected settings.
*/
const saveButton = document.querySelector("#save-button");
saveButton.addEventListener("click", storeSettings);

const resetButton = document.querySelector("#reset-button");
resetButton.addEventListener("click", restoreDefaults);
