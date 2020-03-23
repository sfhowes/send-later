/*
TODO:
    * Right now this whole file is just skeleton functions for testing purposes.
*/

// async function mainfunc() {
//   const accts = await browser.accounts.list();
//   console.log(accts);
//   var draftFolders = [];
//   for (var i=0; i<accts.length; i++) {
//     for (var j=0; j<accts[i].folders.length; j++) {
//       if (accts[i].folders[j].type == "drafts") {
//         draftFolders.push(accts[i].folders[j]);
//       }
//     }
//   }
//   console.log(draftFolders);
// }
// mainfunc().catch(console.error);

browser.commands.onCommand.addListener(async function(command) {
  if (command == "do-send-later") {
    // await browser.windows.getAll({
    //   windowTypes: ["messageCompose"],
    // }).then(function(w) {
    //   //console.log(w);
    //   console.log(w.length);
    //   for (var i=0;i<w.length; i++) {
    //     if (w[i].focused) {
    //       console.log(w[i]);
    //     }
    //   }
    // });
    browser.compose.beginNew({
      to: ["sendlater@inverted.earth"],
      subject: "[Send Later]",
      body: "testing sendlater."
    });
  }
});

// function onCreated() {
//   if (browser.runtime.lastError) {
//     console.log(`Error: ${browser.runtime.lastError}`);
//   } else {
//     console.log("Item created successfully");
//   }
// }
//
// browser.menus.create({
//   id: "tools-menu",
//   title: "THIS IS A MENU ITEM",
//   contexts: ["all"],
// }, onCreated);
//
// console.log("Huh");

let doBeforeSend = (tabID, details) => {
  console.log("SENDING...");
  console.log(details);
  return { cancel: false };
};

async function myfunc() {
  var appname = await browser.sendLater.appName();
  console.log(appname);

  var uuid = await SLUtil.getInstanceUuid();
  console.log(uuid);
}

browser.compose.onBeforeSend.addListener(doBeforeSend);

myfunc();
