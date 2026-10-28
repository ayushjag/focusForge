import assert from "node:assert/strict";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { API_BASE_URL, WEB_APP_ORIGIN } from "../config.js";

const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 1 && args[0] === "--local"), "Usage: build.mjs [--local]");
const local = args[0] === "--local";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const output = resolve(dist, local ? "local" : "production");
assert.ok(output.startsWith(`${dist}${sep}`) && dirname(output) === dist, "Output must stay inside extension/dist");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const directory of ["background", "blocked", "content", "popup", "services"]) {
  await cp(join(root, directory), join(output, directory), { recursive: true });
}

const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
manifest.content_scripts[0].matches = local
  ? ["http://localhost/*", "http://127.0.0.1/*"]
  : [`${WEB_APP_ORIGIN}/*`];
if (local) manifest.name = "FocusForge Local";

const apiUrl = local ? "http://127.0.0.1:5000" : API_BASE_URL;
const webOrigin = local ? "http://localhost:3000" : WEB_APP_ORIGIN;
await writeFile(join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(join(output, "config.js"), [
  `export const API_BASE_URL = ${JSON.stringify(apiUrl)};`,
  `export const WEB_APP_ORIGIN = ${JSON.stringify(webOrigin)};`,
  "",
].join("\n"));
console.log(`Built ${local ? "local" : "production"} extension: ${output}`);
