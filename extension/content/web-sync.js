window.addEventListener("message", (event) => {
  if (
    event.source !== window ||
    event.origin !== window.location.origin ||
    event.data?.type !== "FOCUSFORGE_SYNC_BLOCKING_STATE"
  ) {
    return;
  }

  chrome.runtime.sendMessage({ type: "SYNC_BLOCKING_STATE" }).catch(() => {
    // The periodic alarm will retry if the background worker is restarting.
  });
});
