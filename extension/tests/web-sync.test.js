import assert from "node:assert/strict";
import test from "node:test";

test("web sync forwards only same-origin FocusForge signals", async () => {
  let listener;
  const messages = [];
  globalThis.window = {
    location: { origin: "http://localhost:3000" },
    addEventListener: (_name, handler) => { listener = handler; },
  };
  globalThis.chrome = {
    runtime: { sendMessage: async (message) => { messages.push(message); } },
  };

  await import("../content/web-sync.js");

  listener({ source: window, origin: "http://other.test", data: { type: "FOCUSFORGE_SYNC_BLOCKING_STATE" } });
  listener({ source: {}, origin: window.location.origin, data: { type: "FOCUSFORGE_SYNC_BLOCKING_STATE" } });
  listener({ source: window, origin: window.location.origin, data: { type: "OTHER_MESSAGE" } });
  assert.deepEqual(messages, []);

  listener({ source: window, origin: window.location.origin, data: { type: "FOCUSFORGE_SYNC_BLOCKING_STATE" } });
  assert.deepEqual(messages, [{ type: "SYNC_BLOCKING_STATE" }]);
});
