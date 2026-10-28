import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const extension = resolve(process.argv[2] ?? "");
const manifest = JSON.parse(await readFile(join(extension, "manifest.json"), "utf8"));
const profile = await mkdtemp(join(tmpdir(), "focusforge-package-smoke-"));
let browser;
try {
  browser = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = browser.serviceWorkers()[0] ?? await browser.waitForEvent("serviceworker", { timeout: 15_000 });
  const popup = await browser.newPage();
  await popup.goto(`chrome-extension://${new URL(worker.url()).host}/popup/popup.html`);
  await popup.waitForFunction(async () => {
    try { return (await chrome.runtime.sendMessage({ type: "PING" }))?.ready === true; }
    catch { return false; }
  }, null, { timeout: 15_000 });
  const result = await popup.evaluate(async () => ({
    version: chrome.runtime.getManifest().version,
    response: await chrome.runtime.sendMessage({ type: "PING" }),
  }));
  assert.equal(result.version, manifest.version);
  assert.equal(result.response?.ready, true);
  console.log(`Fresh Chromium load passed: v${result.version}, background worker ready`);
} finally {
  await browser?.close();
  if (resolve(profile).startsWith(`${resolve(tmpdir())}${process.platform === "win32" ? "\\" : "/"}`) &&
    basename(profile).startsWith("focusforge-package-smoke-")) {
    await rm(profile, { recursive: true, force: true });
  }
}
