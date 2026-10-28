import assert from "node:assert/strict";
import test from "node:test";
import { getStoredAuth, login } from "../services/auth.js";
import { API_BASE_URL } from "../config.js";

test("deployed extension does not reuse a saved login from the old local backend", async () => {
  const storage = { focusForgeAuth: { accessToken: "legacy-local-token" } };
  globalThis.chrome = { storage: { local: {
    get: async (key) => ({ [key]: storage[key] }),
    set: async (values) => Object.assign(storage, values),
  } } };
  assert.equal(await getStoredAuth(), null);

  globalThis.fetch = async () => Response.json({
    success: true, data: { accessToken: "production-token", user: { email: "test@example.com" } },
  });
  await login("test@example.com", "test-password");
  assert.equal(storage[`focusForgeAuth:${API_BASE_URL}`].accessToken, "production-token");
  assert.equal((await getStoredAuth()).user.email, "test@example.com");
  assert.equal(storage.focusForgeAuth.accessToken, "legacy-local-token");
});
