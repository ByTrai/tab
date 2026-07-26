import { test, expect, chromium } from "@playwright/test";
import path from "node:path";

test("captures an ordinary tab while preserving a pinned tab", async () => {
  const extensionPath = path.resolve("apps/extension");
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  const ordinary = await context.newPage();
  await ordinary.goto("https://example.com");
  const pinned = await context.newPage();
  await pinned.goto("https://example.org");

  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
  const extensionId = new URL(worker.url()).host;
  await worker.evaluate(async () => {
    const tabs = await chrome.tabs.query({ url: "https://example.org/*" });
    if (tabs[0]?.id) await chrome.tabs.update(tabs[0].id, { pinned: true });
  });
  const dashboard = await context.newPage();
  await dashboard.goto(`chrome-extension://${extensionId}/newtab.html`);
  await expect(dashboard.getByRole("heading", { name: "Make room to focus." })).toBeVisible();
  await expect(dashboard.locator(".tab-row")).not.toHaveCount(0);
  await dashboard.getByRole("button", { name: "Save & close" }).click();
  await expect(dashboard.getByRole("status")).toContainText("saved");
  const remaining = await worker.evaluate(() => chrome.tabs.query({ currentWindow: true }));
  expect(remaining.some((tab) => tab.pinned && tab.url?.startsWith("https://example.org"))).toBe(true);
  expect(remaining.some((tab) => tab.url?.startsWith("https://example.com"))).toBe(false);
  await context.close();
});
