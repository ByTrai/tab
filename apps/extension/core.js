export const RESTRICTED_PROTOCOLS = new Set([
  "about:",
  "chrome:",
  "chrome-extension:",
  "devtools:",
  "edge:",
  "file:",
  "view-source:",
]);

export function classifyTab(tab) {
  if (!tab || !Number.isInteger(tab.id)) {
    return { capturable: false, reason: "This tab is no longer available." };
  }
  if (!tab.url) {
    return { capturable: false, reason: "The browser did not expose this tab's address." };
  }

  try {
    const parsed = new URL(tab.url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        capturable: false,
        reason: RESTRICTED_PROTOCOLS.has(parsed.protocol)
          ? "Browser and local pages cannot be captured."
          : `The ${parsed.protocol} protocol is not supported.`,
      };
    }
    return { capturable: true, normalizedUrl: parsed.toString() };
  } catch {
    return { capturable: false, reason: "This tab has an invalid address." };
  }
}

export function normalizedUrlKey(value) {
  const url = new URL(value);
  url.hash = "";
  return url.toString();
}

export class CaptureService {
  constructor({ browser, repository, now = () => new Date().toISOString(), createId = () => crypto.randomUUID() }) {
    this.browser = browser;
    this.repository = repository;
    this.now = now;
    this.createId = createId;
  }

  async inventory() {
    const tabs = await this.browser.currentWindowTabs();
    return tabs.map((tab) => ({ ...tab, eligibility: classifyTab(tab) }));
  }

  async capture({ commandId, tabIds, close = false, duplicatePolicy = "skip" }) {
    if (!commandId || !Array.isArray(tabIds) || tabIds.length === 0) {
      throw new Error("Select at least one tab to save.");
    }
    const prior = await this.repository.operation(commandId);
    if (prior) return prior;

    const current = await this.browser.currentWindowTabs();
    const requested = new Set(tabIds);
    const selected = current.filter((tab) => requested.has(tab.id));
    const rejected = selected.filter((tab) => !classifyTab(tab).capturable);
    if (rejected.length > 0) throw new Error(`${rejected.length} selected tab(s) cannot be captured.`);

    const existingKeys = new Set((await this.repository.savedItems()).map((item) => normalizedUrlKey(item.url)));
    const duplicates = [];
    const items = [];
    for (const tab of selected) {
      const eligibility = classifyTab(tab);
      if (!eligibility.capturable) continue;
      const key = normalizedUrlKey(eligibility.normalizedUrl);
      if (existingKeys.has(key) && duplicatePolicy === "skip") {
        duplicates.push(tab.id);
        continue;
      }
      existingKeys.add(key);
      items.push({
        id: this.createId(),
        tabId: tab.id,
        url: eligibility.normalizedUrl,
        title: tab.title || new URL(eligibility.normalizedUrl).hostname,
        capturedAt: this.now(),
        pinned: Boolean(tab.pinned),
        index: tab.index,
      });
    }

    const operation = {
      id: commandId,
      stage: "saved",
      closeRequested: close,
      createdAt: this.now(),
      items,
      duplicateTabIds: duplicates,
      closedTabIds: [],
    };

    // The single repository commit is the no-loss boundary: browser mutation is forbidden before it resolves.
    await this.repository.commitCapture(operation, items);

    if (!close) return operation;
    const closableIds = items.filter((item) => !item.pinned).map((item) => item.tabId);
    const closing = { ...operation, stage: "closing", closedTabIds: closableIds };
    // Persist closure intent and the undo payload before touching the browser. Recovery can safely
    // distinguish tabs that still exist if the worker is suspended during chrome.tabs.remove.
    await this.repository.updateOperation(closing);
    if (closableIds.length > 0) await this.browser.closeTabs(closableIds);
    const closed = { ...closing, stage: "closed" };
    await this.repository.updateOperation(closed);
    return closed;
  }

  async undo(commandId) {
    const operation = await this.repository.operation(commandId);
    if (!operation) throw new Error("The capture operation is no longer available.");
    if (operation.stage === "undone") return operation;

    const closed = new Set(operation.closedTabIds);
    const openTabs = await this.browser.currentWindowTabs();
    const openKeys = new Set(openTabs.filter((tab) => classifyTab(tab).capturable).map((tab) => normalizedUrlKey(tab.url)));
    let undoing = { ...operation, stage: "undoing", restoredItemIds: operation.restoredItemIds ?? [] };
    await this.repository.updateOperation(undoing);
    for (const item of [...operation.items].sort((a, b) => a.index - b.index)) {
      if (!closed.has(item.tabId) || undoing.restoredItemIds.includes(item.id) || openKeys.has(normalizedUrlKey(item.url))) continue;
      await this.browser.openTab({ url: item.url, pinned: item.pinned, index: item.index });
      undoing = { ...undoing, restoredItemIds: [...undoing.restoredItemIds, item.id] };
      await this.repository.updateOperation(undoing);
    }
    await this.repository.removeItems(operation.items.map((item) => item.id));
    const undone = { ...undoing, stage: "undone", undoneAt: this.now() };
    await this.repository.updateOperation(undone);
    return undone;
  }
}
