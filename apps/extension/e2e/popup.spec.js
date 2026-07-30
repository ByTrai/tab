import { test, expect, chromium } from "@playwright/test";
import path from "node:path";

async function launchExtension() {
  const extensionPath = path.resolve("apps/extension");
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
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

test("popup captures an ordinary tab via the shared capture command", async () => {
  const { context, worker, extensionId } = await launchExtension();
  const ordinary = await context.newPage();
  await ordinary.goto("https://example.com/popup-capture");

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.locator("#tabs .tab-row")).not.toHaveCount(0);
  await popup.getByRole("button", { name: "Save", exact: true }).click();
  await expect(popup.locator("#toast")).toBeVisible();
  await expect(popup.locator("#status")).toContainText(/saved/i);

  const state = await popup.evaluate(
    () =>
      new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "state" }, (result) => {
          resolve(
            result ?? { ok: false, error: chrome.runtime.lastError?.message },
          );
        });
      }),
  );
  expect(state.ok).toBe(true);
  expect(
    state.value.items.some((item) =>
      String(item.url).startsWith("https://example.com/popup-capture"),
    ),
  ).toBe(true);
  await context.close();
});

test("recover closes an interrupted closing journal seeded in IndexedDB", async () => {
  const { context, worker, extensionId } = await launchExtension();
  const page = await context.newPage();
  await page.goto("https://example.com/recover-closing");

  const tabId = await worker.evaluate(async () => {
    const tabs = await chrome.tabs.query({
      url: "https://example.com/recover-closing*",
    });
    return tabs[0]?.id ?? null;
  });
  expect(tabId).not.toBeNull();

  // Seed a closing-stage journal entry the way a suspended worker would leave it.
  await worker.evaluate(async (id) => {
    const now = new Date().toISOString();
    const item = {
      id: "e2e-closing-item",
      kind: "link",
      title: "Recover closing",
      url: "https://example.com/recover-closing",
      createdAt: now,
      capturedAt: now,
      tabId: id,
      pinned: false,
      index: 0,
    };
    const operation = {
      id: "e2e-closing-op",
      stage: "closing",
      closeRequested: true,
      createdAt: now,
      items: [item],
      duplicateTabIds: [],
      closedTabIds: [id],
      failedCloseIds: [],
    };

    await new Promise((resolve, reject) => {
      const open = indexedDB.open("tabby-extension", 1);
      open.onupgradeneeded = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains("capture-state")) {
          db.createObjectStore("capture-state");
        }
      };
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction("capture-state", "readwrite");
        tx.objectStore("capture-state").put(
          {
            schemaVersion: 2,
            items: [item],
            operations: [operation],
          },
          "primary",
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      open.onerror = () => reject(open.error);
    });
  }, tabId);

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  const response = await popup.evaluate(
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
  expect(response.value.some((op) => op.stage === "closed")).toBe(true);

  const remaining = await worker.evaluate(() =>
    chrome.tabs.query({ url: "https://example.com/recover-closing*" }),
  );
  expect(remaining.length).toBe(0);
  await context.close();
});
