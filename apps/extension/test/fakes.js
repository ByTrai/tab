import { normalizeHttpUrl } from "../packages/workspace-contracts/index.js";

export class FakeBrowser {
  /**
   * @param {object[]} tabs
   * @param {{ failCloseIds?: number[]; failOpenUrls?: string[] }} [options]
   */
  constructor(tabs, options = {}) {
    this.tabs = structuredClone(tabs);
    this.closed = [];
    this.opened = [];
    this.failCloseIds = new Set(options.failCloseIds ?? []);
    this.failOpenUrls = new Set(options.failOpenUrls ?? []);
  }

  capabilities() {
    return {
      tabs: true,
      sessions: false,
      contextMenus: false,
      sidePanel: false,
    };
  }

  async currentWindowTabs() {
    return structuredClone(this.tabs);
  }

  async closeTabs(ids) {
    const closedIds = [];
    const failedIds = [];
    for (const id of ids) {
      if (this.failCloseIds.has(id) || !this.tabs.some((tab) => tab.id === id)) {
        failedIds.push(id);
        continue;
      }
      closedIds.push(id);
      this.closed.push(id);
      this.tabs = this.tabs.filter((tab) => tab.id !== id);
    }
    return { closedIds, failedIds };
  }

  async openTab(tab) {
    const url = normalizeHttpUrl(tab.url);
    if (!url) {
      throw new Error("Refusing to open an unsafe or credential-bearing URL.");
    }
    if (this.failOpenUrls.has(url) || this.failOpenUrls.has(tab.url)) {
      throw new Error("Injected open failure");
    }
    const opened = { ...tab, url };
    this.opened.push(opened);
    this.tabs.push({
      ...opened,
      id: 100 + this.opened.length,
      title: opened.title || url,
      pinned: Boolean(opened.pinned),
      index: opened.index ?? this.tabs.length,
    });
    return opened;
  }
}

export class FakeRepository {
  constructor({ failCommit = false } = {}) {
    this.items = [];
    this.journal = [];
    this.failCommit = failCommit;
  }
  async savedItems() {
    return structuredClone(this.items);
  }
  async operations() {
    return structuredClone(this.journal);
  }
  async operation(id) {
    return structuredClone(this.journal.find((entry) => entry.id === id));
  }
  async commitCapture(operation, items) {
    if (this.failCommit) throw new Error("Injected storage failure");
    if (this.journal.some(({ id }) => id === operation.id)) return;
    this.items.push(...structuredClone(items));
    this.journal.push(structuredClone(operation));
  }
  async updateOperation(operation) {
    this.journal = this.journal.map((entry) =>
      entry.id === operation.id ? structuredClone(operation) : entry,
    );
  }
  async removeItems(ids) {
    this.items = this.items.filter(({ id }) => !ids.includes(id));
  }
}
