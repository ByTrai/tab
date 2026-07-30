#!/usr/bin/env node
/**
 * Minimal CycloneDX-like SBOM for production npm dependencies.
 * Not a full OWASP generator — enough for private-alpha provenance notes.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const lock = JSON.parse(
  await readFile(path.join(root, "package-lock.json"), "utf8"),
);

const components = Object.entries(lock.packages || {})
  .filter(
    ([name, meta]) =>
      name && meta.version && !name.includes("node_modules/@tabby/"),
  )
  .map(([name, meta]) => {
    const purlName = name.replace(/^node_modules\//, "");
    return {
      type: "library",
      name: purlName,
      version: meta.version,
      purl: `pkg:npm/${purlName}@${meta.version}`,
    };
  });

const bom = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    component: {
      type: "application",
      name: pkg.name,
      version: pkg.version,
    },
    tools: [{ name: "tabby-release-sbom", version: "0.1.0" }],
  },
  components,
};

const json = `${JSON.stringify(bom, null, 2)}\n`;
const outDir = path.join(root, "artifacts");
await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, "sbom.json");
await writeFile(outFile, json);
const digest = createHash("sha256").update(json).digest("hex");
await writeFile(path.join(outDir, "sbom.sha256"), `${digest}  sbom.json\n`);
console.log(`Wrote ${outFile} (${components.length} components)`);
