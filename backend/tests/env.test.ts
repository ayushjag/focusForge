import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

function loadedUrls(directUrl?: string) {
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/override" };
  delete env.DATABASE_URL_UNPOOLED;
  if (directUrl) env.DATABASE_URL_UNPOOLED = directUrl;
  const result = spawnSync(process.execPath, [
    "--import", "tsx", "--input-type=module", "--eval",
    'import "./src/config/load-env.ts"; console.log(JSON.stringify({ url: process.env.DATABASE_URL, direct: process.env.DATABASE_URL_UNPOOLED }));',
  ], { cwd: fileURLToPath(new URL("..", import.meta.url)), env, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("explicit database overrides stay paired instead of mixing with local Neon credentials", () => {
  const { url, direct } = loadedUrls();
  assert.equal(url, "postgresql://test:test@127.0.0.1:5432/override");
  assert.equal(direct, url);
});

test("an explicitly supplied migration URL takes precedence over environment files", () => {
  const directUrl = "postgresql://test:test@127.0.0.1:5433/migrations";
  assert.equal(loadedUrls(directUrl).direct, directUrl);
});
