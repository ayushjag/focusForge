import assert from "node:assert/strict";
import test from "node:test";
import { withNeonConnectionTimeout } from "../src/config/database-url.js";

test("Neon pooled and direct connections get a bounded timeout without changing credentials or TLS options", () => {
  for (const host of ["ep-example.neon.tech", "ep-example-pooler.neon.tech"]) {
    const original = `postgresql://test:p%40ss@${host}/neondb?sslmode=require&channel_binding=require`;
    const result = new URL(withNeonConnectionTimeout(original)!);
    assert.equal(result.searchParams.get("connect_timeout"), "15");
    assert.equal(result.hostname, host);
    assert.equal(result.username, "test");
    assert.equal(result.password, "p%40ss");
    assert.equal(result.pathname, "/neondb");
    assert.equal(result.searchParams.get("sslmode"), "require");
    assert.equal(result.searchParams.get("channel_binding"), "require");
  }
});

test("explicit connection timeouts are preserved, including zero", () => {
  for (const timeout of ["0", "30"]) {
    const url = `postgresql://test:test@ep-example.neon.tech/neondb?connect_timeout=${timeout}`;
    assert.equal(withNeonConnectionTimeout(url), url);
  }
});

test("local, non-Neon, missing, and malformed URLs are left to the existing configuration validation", () => {
  for (const value of [
    undefined, "", "invalid-url",
    "postgresql://test:test@localhost:5432/focusforge",
    "postgresql://test:test@ep-example.neon.tech.example.com/neondb",
    "https://ep-example.neon.tech/neondb",
  ]) {
    assert.equal(withNeonConnectionTimeout(value), value);
  }
});
