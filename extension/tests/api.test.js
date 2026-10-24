import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, apiRequest } from "../services/api.js";

test("apiRequest sends JSON and bearer authentication", async () => {
  let capturedRequest;

  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return new Response(JSON.stringify({ success: true, data: { ok: true } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const response = await apiRequest("/api/example", {
    method: "POST",
    token: "test-token",
    body: { value: 1 },
  });

  assert.equal(capturedRequest.url, "http://127.0.0.1:5000/api/example");
  assert.equal(capturedRequest.options.headers.Authorization, "Bearer test-token");
  assert.equal(capturedRequest.options.headers["Content-Type"], "application/json");
  assert.equal(capturedRequest.options.body, JSON.stringify({ value: 1 }));
  assert.deepEqual(response.data, { ok: true });
});

test("apiRequest preserves backend error details", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );

  await assert.rejects(
    () => apiRequest("/api/private"),
    (error) =>
      error instanceof ApiError &&
      error.status === 401 &&
      error.code === "UNAUTHORIZED" &&
      error.message === "Authentication required",
  );
});

test("apiRequest converts a network failure into a safe API error", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("connection refused");
  };

  await assert.rejects(
    () => apiRequest("/api/health"),
    (error) =>
      error instanceof ApiError &&
      error.status === 0 &&
      error.code === "NETWORK_ERROR",
  );
});
