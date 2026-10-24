import assert from "node:assert/strict";
import test from "node:test";
import { applyBlockingRules, clearBlockingRules, redirectOpenBlockedTabs } from "../services/blocking.js";

test("applyBlockingRules replaces existing rules with unique domain redirects", async () => {
  const updates = [];

  globalThis.chrome = {
    declarativeNetRequest: {
      getDynamicRules: async () => [{ id: 42 }],
      updateDynamicRules: async (update) => updates.push(update),
    },
  };

  await applyBlockingRules(["youtube.com", "reddit.com", "youtube.com"]);

  assert.deepEqual(updates[0].removeRuleIds, [42]);
  assert.deepEqual(
    updates[0].addRules.map((rule) => ({
      id: rule.id,
      filter: rule.condition.urlFilter,
      resourceTypes: rule.condition.resourceTypes,
      redirect: rule.action.redirect.extensionPath,
    })),
    [
      {
        id: 1000,
        filter: "||reddit.com^",
        resourceTypes: ["main_frame"],
        redirect: "/blocked/blocked.html",
      },
      {
        id: 1001,
        filter: "||youtube.com^",
        resourceTypes: ["main_frame"],
        redirect: "/blocked/blocked.html",
      },
    ],
  );
});

test("applyBlockingRules removes all rules when the domain list is empty", async () => {
  const updates = [];

  globalThis.chrome = {
    declarativeNetRequest: {
      getDynamicRules: async () => [{ id: 1000 }, { id: 1001 }],
      updateDynamicRules: async (update) => updates.push(update),
    },
  };

  await applyBlockingRules([]);

  assert.deepEqual(updates, [{ removeRuleIds: [1000, 1001], addRules: [] }]);
});

test("clearBlockingRules removes existing rules and does nothing when none exist", async () => {
  const updates = [];
  let existingRules = [{ id: 1000 }];

  globalThis.chrome = {
    declarativeNetRequest: {
      getDynamicRules: async () => existingRules,
      updateDynamicRules: async (update) => updates.push(update),
    },
  };

  await clearBlockingRules();
  existingRules = [];
  await clearBlockingRules();

  assert.deepEqual(updates, [{ removeRuleIds: [1000] }]);
});

test("redirectOpenBlockedTabs redirects existing matching tabs", async () => {
  const updated = [];
  let requestedPatterns;
  globalThis.chrome = {
    runtime: { getURL: (path) => `chrome-extension://focusforge/${path}` },
    tabs: {
      query: async ({ url }) => {
        requestedPatterns = url;
        return [{ id: 11 }, { id: 12 }];
      },
      update: async (id, options) => updated.push({ id, ...options }),
    },
  };

  await redirectOpenBlockedTabs(["youtube.com", "youtube.com"]);

  assert.deepEqual(requestedPatterns, ["*://*.youtube.com/*"]);
  assert.deepEqual(updated, [
    { id: 11, url: "chrome-extension://focusforge/blocked/blocked.html" },
    { id: 12, url: "chrome-extension://focusforge/blocked/blocked.html" },
  ]);
});

test("redirectOpenBlockedTabs leaves tabs alone when the session has no blocked domains", async () => {
  globalThis.chrome = {
    tabs: { query: () => { throw new Error("No query expected"); } },
  };

  await redirectOpenBlockedTabs([]);
});
