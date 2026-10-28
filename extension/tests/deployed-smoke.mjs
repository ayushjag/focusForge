import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { lookup, Resolver } from "node:dns/promises";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { isIP } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { API_BASE_URL, WEB_APP_ORIGIN } from "../config.js";
import pg from "pg";

for (const path of ["../../.env.local", "../../.env"]) {
  const file = fileURLToPath(new URL(path, import.meta.url));
  if (existsSync(file)) process.loadEnvFile(file);
}

const { chromium, expect } = createRequire(new URL("../../frontend/package.json", import.meta.url))("@playwright/test");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const profile = await mkdtemp(join(tmpdir(), "focusforge-extension-smoke-"));
const artifacts = join(root, "test-results", "deployed");
const email = `extension-smoke-${randomUUID()}@focusforge.test`;
const password = `Smoke-${randomUUID()}-password`;
let context;
let userId;
let database;

try {
  const connection = new URL(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "");
  assert.ok(connection.hostname.endsWith(".neon.tech"), "The cleanup connection must target Neon");
  const dnsServer = process.env.FOCUSFORGE_TEST_DNS_SERVER;
  let address;
  if (dnsServer) {
    assert.ok(isIP(dnsServer), "The optional test DNS server must be an IP address");
    const resolver = new Resolver();
    resolver.setServers([dnsServer]);
    [address] = await resolver.resolve4(connection.hostname);
  } else {
    ({ address } = await lookup(connection.hostname));
  }
  database = new pg.Client({
    host: address,
    port: Number(connection.port || 5432),
    user: decodeURIComponent(connection.username),
    password: decodeURIComponent(connection.password),
    database: decodeURIComponent(connection.pathname.slice(1)),
    connectionTimeoutMillis: 15_000,
    ssl: { servername: connection.hostname, rejectUnauthorized: true },
  });
  await database.connect();
  await database.query("SELECT 1");
  context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
  const extensionId = new URL(worker.url()).host;
  const extensionOrigin = `chrome-extension://${extensionId}`;

  async function request(path, { method = "GET", data } = {}) {
    const response = await context.request.fetch(`${WEB_APP_ORIGIN}${path}`, { method, data, timeout: 60_000 });
    assert.ok(response.ok(), `${method} ${path} returned ${response.status()}`);
    return response.json();
  }

  const health = await context.request.get(`${API_BASE_URL}/api/health/database`, { timeout: 60_000 });
  assert.ok(health.ok(), "The deployed API must be reachable");
  const registered = await request("/api/auth/register", {
    method: "POST", data: { email, password, timezone: "UTC" },
  });
  userId = registered.data.id;
  const savedUser = await database.query('SELECT "id" FROM "User" WHERE "email" = $1', [email]);
  assert.equal(savedUser.rows[0]?.id, userId, "Cleanup database must match the deployed API's database");
  await request("/api/backend/tasks", {
    method: "POST", data: { title: "Verify deployed extension", priority: "HIGH" },
  });
  console.log("PASS: Vercel signup and task creation reach the deployed Render API and Neon");

  const popup = await context.newPage();
  await popup.goto(`${extensionOrigin}/popup/popup.html`);
  await popup.locator("#email").fill(email);
  await popup.locator("#password").fill(password);
  await popup.locator("#login-button").click();
  await expect(popup.locator("#account-title")).toHaveText(email, { timeout: 30_000 });
  await expect(popup.locator("#status-title")).toHaveText("Ready", { timeout: 30_000 });
  console.log("PASS: the actual extension popup signs in to the deployed API");

  await worker.evaluate((origin) => {
    globalThis.focusForgeSmokeWebSignals = 0;
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (message.type === "SYNC_BLOCKING_STATE" && sender.url?.startsWith(`${origin}/`)) {
        globalThis.focusForgeSmokeWebSignals += 1;
      }
    });
  }, WEB_APP_ORIGIN);

  const website = await context.newPage();
  await website.goto(`${WEB_APP_ORIGIN}/focus`);
  await website.getByRole("button", { name: "Start focus session" }).click();
  await expect(website.getByRole("button", { name: "Finish session" })).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => worker.evaluate(() => globalThis.focusForgeSmokeWebSignals), { timeout: 20_000 }).toBeGreaterThan(0);

  await website.goto(`${WEB_APP_ORIGIN}/blocked-sites`);
  await website.getByRole("textbox", { name: "Website domain or URL" }).fill("example.org");
  await website.getByRole("button", { name: "Add site" }).click();
  await expect.poll(() => worker.evaluate(async () => {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    return rules.some((rule) => rule.condition.urlFilter === "||example.org^");
  }), { timeout: 20_000 }).toBe(true);
  console.log("PASS: adding a site on Vercel during a session automatically installs the blocking rule");

  const blockedTab = await context.newPage();
  await blockedTab.goto("https://example.org", { timeout: 20_000 }).catch(() => {});
  await expect(blockedTab).toHaveURL(`${extensionOrigin}/blocked/blocked.html`, { timeout: 15_000 });
  await mkdir(artifacts, { recursive: true });
  await blockedTab.screenshot({ path: join(artifacts, "blocked.png"), fullPage: true });
  await popup.reload();
  await expect(popup.locator("#status-title")).toHaveText("Focus session active", { timeout: 30_000 });
  await popup.screenshot({ path: join(artifacts, "popup.png"), fullPage: true });
  console.log("PASS: a real browser navigation is redirected to the extension's blocked page");

  await website.goto(`${WEB_APP_ORIGIN}/focus`);
  await website.getByRole("button", { name: "Finish session" }).click();
  await expect.poll(() => worker.evaluate(async () =>
    (await chrome.declarativeNetRequest.getDynamicRules()).length,
  ), { timeout: 20_000 }).toBe(0);
  await blockedTab.goto("https://example.org", { timeout: 30_000 });
  assert.equal(new URL(blockedTab.url()).hostname, "example.org");
  console.log("PASS: finishing the session on Vercel automatically removes blocking and the site opens");
} catch (error) {
  console.error("FAIL:", error instanceof Error
    ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[REDACTED_DATABASE_URL]")
    : "Deployed extension test failed");
  process.exitCode = 1;
} finally {
  if (context) await context.close();
  try {
    if (userId) {
      await database.query('DELETE FROM "User" WHERE "id" = $1 AND "email" = $2', [userId, email]);
      console.log("CLEANUP: removed this run's temporary account and related records");
    }
  } finally {
    if (database) await database.end();
    assert.equal(dirname(profile), resolve(tmpdir()), "Profile cleanup must stay in the temporary directory");
    assert.ok(basename(profile).startsWith("focusforge-extension-smoke-"));
    await rm(profile, { recursive: true, force: true });
  }
}
