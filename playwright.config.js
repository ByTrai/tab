import { defineConfig } from "@playwright/test";

/**
 * Loaded-extension scenarios need headed Chromium with --load-extension.
 * Prefer Playwright's bundled Chromium — stable Chrome removed these flags.
 * CI runs under xvfb-run (see .github/workflows/quality.yml).
 */
export default defineConfig({
  testDir: "apps/extension/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    trace: "on-first-retry",
    channel: "chromium",
  },
});
