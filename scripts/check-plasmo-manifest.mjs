/**
 * Fail CI if the Plasmo parallel shell gains unexpected privileges.
 * optional_permissions may include contextMenus only (user-gated).
 */
import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "apps/extension-plasmo",
);

const packageJson = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);
const declared = [...(packageJson.manifest?.permissions ?? [])].sort();
const expected = ["tabs"];
if (JSON.stringify(declared) !== JSON.stringify(expected)) {
  throw new Error(
    `Plasmo package.json permissions changed: expected ${JSON.stringify(expected)}, received ${JSON.stringify(declared)}`,
  );
}
const optional = [...(packageJson.manifest?.optional_permissions ?? [])].sort();
const expectedOptional = ["contextMenus"];
if (JSON.stringify(optional) !== JSON.stringify(expectedOptional)) {
  throw new Error(
    `Plasmo optional_permissions changed: expected ${JSON.stringify(expectedOptional)}, received ${JSON.stringify(optional)}`,
  );
}
for (const key of ["host_permissions", "optional_host_permissions"]) {
  const value = packageJson.manifest?.[key];
  if (Array.isArray(value) && value.length > 0) {
    throw new Error(
      `Plasmo manifest declares ${key}: ${JSON.stringify(value)}`,
    );
  }
}

const buildDir = path.join(root, "build", "chrome-mv3-prod");
try {
  await access(buildDir);
} catch {
  console.log(
    "Plasmo package.json privilege baseline is unchanged (no build artifact yet).",
  );
  process.exit(0);
}

const files = await readdir(buildDir);
const manifestName = files.find((name) => name === "manifest.json");
if (!manifestName) {
  throw new Error("Plasmo build is missing manifest.json");
}
const generated = JSON.parse(
  await readFile(path.join(buildDir, "manifest.json"), "utf8"),
);
const generatedPermissions = [...(generated.permissions ?? [])].sort();
if (JSON.stringify(generatedPermissions) !== JSON.stringify(expected)) {
  throw new Error(
    `Generated Plasmo permissions changed: expected ${JSON.stringify(expected)}, received ${JSON.stringify(generatedPermissions)}`,
  );
}
if (generated.host_permissions?.length) {
  throw new Error(
    `Generated Plasmo host_permissions not allowed: ${JSON.stringify(generated.host_permissions)}`,
  );
}
if (generated.content_scripts?.length) {
  throw new Error("Generated Plasmo content_scripts are not allowed.");
}

console.log("Plasmo privilege baseline is unchanged.");
