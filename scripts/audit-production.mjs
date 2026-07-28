#!/usr/bin/env node
/**
 * Fail CI when production advisories remain on packages we ship or pin
 * directly (better-auth, drizzle-orm, and their nested Better Auth packages).
 * Transitive advisories under optional Next image tooling (sharp) or Better
 * Auth's drizzle-kit peer graph (esbuild) are reported as warnings until
 * upstream releases patched versions that do not require --force downgrades.
 */

import { execFileSync } from "node:child_process";

const BLOCKED_PACKAGES = new Set([
  "better-auth",
  "@better-auth/core",
  "@better-auth/utils",
  "@better-auth/drizzle-adapter",
  "drizzle-orm",
]);

const WARN_ONLY = new Set([
  "sharp",
  "esbuild",
  "@esbuild-kit/core-utils",
  "@esbuild-kit/esm-loader",
  "drizzle-kit",
  "next",
]);

let report;
try {
  const raw = execFileSync("npm", ["audit", "--omit=dev", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  report = JSON.parse(raw);
} catch (error) {
  const stdout =
    error && typeof error === "object" && "stdout" in error
      ? String(error.stdout)
      : "";
  if (!stdout) throw error;
  report = JSON.parse(stdout);
}

const vulnerabilities = report.vulnerabilities ?? {};
const blocking = [];
const warnings = [];

for (const [name, entry] of Object.entries(vulnerabilities)) {
  const severity = entry.severity ?? "unknown";
  const via = Array.isArray(entry.via) ? entry.via : [];
  const hasDirectAdvisory = via.some(
    (item) => item && typeof item === "object" && "source" in item,
  );
  const title = via
    .map((item) =>
      typeof item === "string" ? item : (item.title ?? item.url ?? "advisory"),
    )
    .join("; ");
  const line = `${name} (${severity}): ${title}`;

  if (WARN_ONLY.has(name) || !hasDirectAdvisory) {
    warnings.push(line);
    continue;
  }

  if (
    BLOCKED_PACKAGES.has(name) ||
    severity === "critical" ||
    severity === "high"
  ) {
    blocking.push(line);
  } else {
    warnings.push(line);
  }
}

if (warnings.length) {
  console.warn(
    "Accepted residual / non-blocking audit findings:\n" +
      warnings.map((w) => `- ${w}`).join("\n"),
  );
}

if (blocking.length) {
  console.error(
    "Blocking production dependency advisories:\n" +
      blocking.map((b) => `- ${b}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "Production dependency advisory policy passed for pinned runtime packages.",
);
