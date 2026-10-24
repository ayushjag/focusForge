export function requestExtensionSync() {
  window.postMessage({ type: "FOCUSFORGE_SYNC_BLOCKING_STATE" }, window.location.origin);
}
