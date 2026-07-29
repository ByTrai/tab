import { test, expect, chromium } from "@playwright/test";
import path from "node:path";

async function launchExtension() {
  const extensionPath = path.resolve("apps/extension");
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const extensionId = new URL(worker.url()).host;
  return { context, worker, extensionId };
}

test("captures an ordinary tab while preserving a pinned tab", async () => {
  const { context, worker, extensionId } = await launchExtension();
  const ordinary = await context.newPage();
  await ordinary.goto("https://example.com");
  const pinned = await context.newPage();
  await pinned.goto("https://example.org");

  await worker.evaluate(async () => {
    const tabs = await chrome.tabs.query({ url: "https://example.org/*" });
    if (tabs[0]?.id) await chrome.tabs.update(tabs[0].id, { pinned: true });
  });
  const dashboard = await context.newPage();
  await dashboard.goto(`chrome-extension://${extensionId}/newtab.html`);
  await expect(
    dashboard.getByRole("heading", { name: "Make room to focus." }),
  ).toBeVisible();
  await expect(dashboard.locator(".tab-row")).not.toHaveCount(0);
  await dashboard.getByRole("button", { name: "Save & close" }).click();
  await expect(dashboard.getByRole("status")).toContainText(/saved|Saved/i);
  const remaining = await worker.evaluate(() =>
    chrome.tabs.query({ currentWindow: true }),
  );
  expect(
    remaining.some(
      (tab) => tab.pinned && tab.url?.startsWith("https://example.org"),
    ),
  ).toBe(true);
  expect(
    remaining.some((tab) => tab.url?.startsWith("https://example.com")),
  ).toBe(false);
  await context.close();
});

test("recover message responds after worker startup (recoverInterrupted coverage)", async () => {
  const { context, extensionId } = await launchExtension();
  const dashboard = await context.newPage();
  await dashboard.goto(`chrome-extension://${extensionId}/newtab.html`);
  await expect(
    dashboard.getByRole("heading", { name: "Make room to focus." }),
  ).toBeVisible();

  const response = await dashboard.evaluate(
    () =>
      new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "recover" }, (result) => {
          resolve(
            result ?? { ok: false, error: chrome.runtime.lastError?.message },
          );
        });
      }),
  );

  expect(response.ok).toBe(true);
  expect(Array.isArray(response.value)).toBe(true);
  await context.close();
});
