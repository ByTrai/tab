#!/usr/bin/env node
/**
 * Zip the baseline unpacked extension for release / rollback drills.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  await readFile(path.join(root, "apps/extension/manifest.json"), "utf8"),
);
const version = manifest.version || "0.0.0";
const outDir = path.join(root, "artifacts");
const outFile = path.join(outDir, `tabby-extension-v${version}.zip`);

await mkdir(outDir, { recursive: true });
execFileSync(
  "zip",
  [
    "-r",
    outFile,
    ".",
    "-x",
    "node_modules/*",
    "node_modules/**/*",
    ".git/*",
    ".git/**/*",
    "test/*",
    "test/**/*",
    "e2e/*",
    "e2e/**/*",
  ],
  { cwd: path.join(root, "apps/extension"), stdio: "inherit" },
);

await writeFile(
  path.join(outDir, "extension-release.json"),
  `${JSON.stringify(
    {
      version,
      artifact: path.basename(outFile),
      permissions: manifest.permissions,
      createdAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
);
console.log(`Wrote ${outFile}`);
