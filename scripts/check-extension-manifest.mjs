import { readFile } from "node:fs/promises";

const manifestPath = new URL(
  "../apps/extension/manifest.json",
  import.meta.url,
);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const expectedPermissions = ["tabs"];
const actualPermissions = [...(manifest.permissions ?? [])].sort();

if (JSON.stringify(actualPermissions) !== JSON.stringify(expectedPermissions)) {
  throw new Error(
    `Extension permissions changed: expected ${JSON.stringify(expectedPermissions)}, received ${JSON.stringify(actualPermissions)}`,
  );
}

for (const forbiddenKey of [
  "host_permissions",
  "content_scripts",
  "optional_host_permissions",
]) {
  if (forbiddenKey in manifest) {
    throw new Error(`Unexpected privileged manifest key: ${forbiddenKey}`);
  }
}

const extensionPages = manifest.content_security_policy?.extension_pages;
if (
  extensionPages &&
  extensionPages !== "script-src 'self'; object-src 'self'"
) {
  throw new Error(`Extension CSP changed unexpectedly: ${extensionPages}`);
}

console.log("Extension manifest privilege baseline is unchanged.");
