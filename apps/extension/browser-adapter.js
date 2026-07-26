export class ChromiumBrowserAdapter {
  async currentWindowTabs() {
    return chrome.tabs.query({ currentWindow: true });
  }

  async closeTabs(ids) {
    await chrome.tabs.remove(ids);
  }

  async openTab(options) {
    return chrome.tabs.create(options);
  }
}
