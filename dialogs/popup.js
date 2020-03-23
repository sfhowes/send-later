// TODO: Placeholder code.

async function putInOutbox(e) {
  e.preventDefault();
  //window.alert("Hello");
  console.log("Putting in outbox");
  console.log(e);
  //console.log(browser.composeAction.setBadgeText({text: "SL"}));

  //Closes the popup.
  window.close();
}

const putInOutboxButton = document.querySelector("#put-in-outbox");
putInOutboxButton.addEventListener("click", putInOutbox);
