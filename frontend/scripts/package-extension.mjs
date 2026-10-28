import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { ZipArchive } from "archiver";

const run = promisify(execFile);
const frontend = resolve(fileURLToPath(new URL("..", import.meta.url)));
const extension = resolve(frontend, "../extension");
const production = join(extension, "dist/production");
const outputDirectory = join(frontend, "public/downloads");
const output = join(outputDirectory, "focusforge-extension.zip");
const files = [
  "manifest.json",
  "config.js",
  "background/service-worker.js",
  "blocked/blocked.css",
  "blocked/blocked.html",
  "blocked/blocked.js",
  "content/web-sync.js",
  "popup/popup.css",
  "popup/popup.html",
  "popup/popup.js",
  "services/api.js",
  "services/auth.js",
  "services/blocking.js",
  "services/focus-state.js",
  "services/session-time.js",
];

await run(process.execPath, [join(extension, "scripts/build.mjs")]);
await mkdir(outputDirectory, { recursive: true });

const archive = new ZipArchive({ zlib: { level: 9 } });
const stream = createWriteStream(output);
const completed = new Promise((resolve, reject) => {
  archive.on("error", reject);
  stream.on("error", reject);
  stream.on("close", resolve);
});
archive.pipe(stream);
for (const file of files) {
  const contents = (await readFile(join(production, file), "utf8")).replace(/\r\n/g, "\n");
  archive.append(Buffer.from(contents), {
    name: file,
    date: new Date("1980-01-01T00:00:00Z"),
    mode: 0o644,
  });
}
await archive.finalize();
await completed;
const zip = await readFile(output);
const manifest = JSON.parse(await readFile(join(production, "manifest.json"), "utf8"));
await writeFile(join(outputDirectory, "extension-release.json"), `${JSON.stringify({
  version: manifest.version,
  file: "focusforge-extension.zip",
  sha256: createHash("sha256").update(zip).digest("hex"),
  bytes: zip.length,
}, null, 2)}\n`);
console.log(`Packaged ${files.length} runtime files: ${output}`);
