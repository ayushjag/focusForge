import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { API_BASE_URL, WEB_APP_ORIGIN } from "../config.js";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));

test("production manifest matches only the deployed website and uses the deployed API", async () => {
  const manifest = await readJson("manifest.json");
  const pkg = await readJson("package.json");
  assert.equal(manifest.version, pkg.version);
  assert.equal(API_BASE_URL, "https://focusforge-4qb1.onrender.com");
  assert.equal(WEB_APP_ORIGIN, "https://focus-forge-ruddy.vercel.app");
  assert.deepEqual(manifest.content_scripts[0].matches, [`${WEB_APP_ORIGIN}/*`]);
  assert.ok(manifest.host_permissions.includes("<all_urls>"));
});

test("production and local packages contain separate targets and only browser runtime files", async () => {
  for (const profile of ["production", "local"]) {
    execFileSync(process.execPath, [
      fileURLToPath(new URL("scripts/build.mjs", root)),
      ...(profile === "local" ? ["--local"] : []),
    ]);
    const manifest = await readJson(`dist/${profile}/manifest.json`);
    const config = await readFile(new URL(`dist/${profile}/config.js`, root), "utf8");
    if (profile === "production") {
      assert.deepEqual(manifest.content_scripts[0].matches, [`${WEB_APP_ORIGIN}/*`]);
      assert.ok(config.includes(API_BASE_URL));
      assert.ok(!config.includes("127.0.0.1"));
    } else {
      assert.deepEqual(manifest.content_scripts[0].matches, ["http://localhost/*", "http://127.0.0.1/*"]);
      assert.ok(config.includes("http://127.0.0.1:5000"));
      assert.equal(manifest.name, "FocusForge Local");
    }
    for (const path of [manifest.background.service_worker, manifest.action.default_popup, ...manifest.content_scripts[0].js]) {
      await access(new URL(`dist/${profile}/${path}`, root));
    }
    await assert.rejects(access(new URL(`dist/${profile}/tests`, root)));
    await assert.rejects(access(new URL(`dist/${profile}/scripts`, root)));
  }
});
