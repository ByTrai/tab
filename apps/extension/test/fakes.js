export class FakeBrowser {
  constructor(tabs) { this.tabs = structuredClone(tabs); this.closed = []; this.opened = []; }
  async currentWindowTabs() { return structuredClone(this.tabs); }
  async closeTabs(ids) { this.closed.push(...ids); this.tabs = this.tabs.filter(({ id }) => !ids.includes(id)); }
  async openTab(tab) { this.opened.push(tab); this.tabs.push({ ...tab, id: 100 + this.opened.length, title: tab.url }); }
}

export class FakeRepository {
  constructor({ failCommit = false } = {}) { this.items = []; this.journal = []; this.failCommit = failCommit; }
  async savedItems() { return structuredClone(this.items); }
  async operations() { return structuredClone(this.journal); }
  async operation(id) { return structuredClone(this.journal.find((entry) => entry.id === id)); }
  async commitCapture(operation, items) {
    if (this.failCommit) throw new Error("Injected storage failure");
    if (this.journal.some(({ id }) => id === operation.id)) return;
    this.items.push(...structuredClone(items)); this.journal.push(structuredClone(operation));
  }
  async updateOperation(operation) { this.journal = this.journal.map((entry) => entry.id === operation.id ? structuredClone(operation) : entry); }
  async removeItems(ids) { this.items = this.items.filter(({ id }) => !ids.includes(id)); }
}
