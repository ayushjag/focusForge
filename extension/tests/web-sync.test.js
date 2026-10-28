import assert from "node:assert/strict";
import test from "node:test";

test("web sync forwards only same-origin FocusForge signals", async () => {
  let listener;
  const messages = [];
  globalThis.window = {
    location: { origin: "https://focus-forge-ruddy.vercel.app" },
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

test("connection bridge returns only status and account id, and rejects foreign messages", async () => {
  let listener;
  const forwarded = [];
  const replies = [];
  globalThis.window = {
    location: { origin: "https://focus-forge-ruddy.vercel.app" },
    addEventListener: (_name, handler) => { listener = handler; },
    postMessage: (message, origin) => { replies.push({ message, origin }); },
  };
  globalThis.chrome = { runtime: { sendMessage: async (message) => {
    forwarded.push(message);
    return { status: "connected", userId: "user-1", accessToken: "never-expose-this" };
  } } };
  await import(`../content/web-sync.js?connection-test`);
  const data = { type: "FOCUSFORGE_CHECK_EXTENSION", requestId: "request-1" };
  listener({ source: {}, origin: window.location.origin, data });
  listener({ source: window, origin: "https://other.test", data });
  listener({ source: window, origin: window.location.origin, data: { ...data, requestId: 1 } });
  assert.deepEqual(forwarded, []);
  listener({ source: window, origin: window.location.origin, data });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(forwarded, [{ type: "CHECK_CONNECTION" }]);
  assert.deepEqual(replies, [{ message: { type: "FOCUSFORGE_EXTENSION_STATUS", requestId: "request-1", status: "connected", userId: "user-1" }, origin: window.location.origin }]);
});
