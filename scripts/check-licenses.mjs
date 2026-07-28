import { readFile } from "node:fs/promises";

const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
const denied = /(?:^|\s|\()(?:(?:AGPL|GPL|LGPL)(?:-|$)|SSPL|BUSL|Commons Clause)/i;
const missing = [];
const rejected = [];

for (const [path, metadata] of Object.entries(lock.packages ?? {})) {
  if (!path.startsWith("node_modules/") || metadata.dev || metadata.optional) continue;
  if (!metadata.license) missing.push(path);
  else if (denied.test(metadata.license)) rejected.push(`${path}: ${metadata.license}`);
}

if (missing.length || rejected.length) {
  const details = [
    missing.length ? `Missing license metadata:\n${missing.join("\n")}` : "",
    rejected.length ? `Review denied/restricted licenses:\n${rejected.join("\n")}` : "",
  ].filter(Boolean);
  throw new Error(details.join("\n\n"));
}

console.log("Production dependency license metadata passed policy checks.");
