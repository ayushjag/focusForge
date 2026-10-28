import assert from "node:assert/strict";
import test from "node:test";
import { API_BASE_URL } from "../config.js";

test("worker connection checks verify sync and never return credentials", async () => {
  const originalFetch = globalThis.fetch;
  const originalChrome = globalThis.chrome;
  let listener;
  const stored = {};
  const key = `focusForgeAuth:${API_BASE_URL}`;
  const addListener = () => {};
  globalThis.chrome = {
    storage: { local: {
      get: async (key) => ({ [key]: stored[key] }),
      set: async (value) => Object.assign(stored, value),
      remove: async (key) => { delete stored[key]; },
    } },
    runtime: { onInstalled: { addListener }, onStartup: { addListener },
      onMessage: { addListener: (handler) => { listener = handler; } } },
    alarms: { clear: async () => {}, onAlarm: { addListener } },
    declarativeNetRequest: { getDynamicRules: async () => [], updateDynamicRules: async () => {} },
  };
  const check = () => new Promise((resolve) => {
    assert.equal(listener({ type: "CHECK_CONNECTION" }, {}, resolve), true);
  });
  try {
    await import("../background/service-worker.js");
    assert.deepEqual(await check(), { status: "signed-out" });
    stored[key] = { accessToken: "test-only-secret", user: { id: "user-1" } };
    globalThis.fetch = async () => Response.json({ data: { blockedDomains: [], isFocusSessionActive: false, serverTime: new Date().toISOString() } });
    assert.deepEqual(await check(), { status: "connected", userId: "user-1" });
    globalThis.fetch = async () => { throw new Error("Network unavailable"); };
    assert.deepEqual(await check(), { status: "unavailable" });
    globalThis.fetch = async () => Response.json({ error: { message: "Expired token" } }, { status: 401 });
    assert.deepEqual(await check(), { status: "unavailable" });
    assert.equal(stored[key], undefined);
    assert.deepEqual(await check(), { status: "signed-out" });
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.chrome = originalChrome;
  }
});
