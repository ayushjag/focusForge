document.querySelector("#back-button").addEventListener("click", () => {
  if (history.length > 1) {
    history.back();
    return;
  }

  window.close();
});
