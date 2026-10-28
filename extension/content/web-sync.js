window.addEventListener("message", (event) => {
  if (event.source === window && event.origin === window.location.origin &&
    event.data?.type === "FOCUSFORGE_CHECK_EXTENSION" && typeof event.data.requestId === "string") {
    const requestId = event.data.requestId;
    chrome.runtime.sendMessage({ type: "CHECK_CONNECTION" }).then((result) => {
      window.postMessage({ type: "FOCUSFORGE_EXTENSION_STATUS", requestId,
        status: result.status, userId: result.userId }, window.location.origin);
    }).catch(() => {
      window.postMessage({ type: "FOCUSFORGE_EXTENSION_STATUS", requestId, status: "unavailable" }, window.location.origin);
    });
    return;
  }
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
