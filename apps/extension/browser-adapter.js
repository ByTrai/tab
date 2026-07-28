import { normalizeHttpUrl } from "./packages/workspace-contracts/index.js";

export class ChromiumBrowserAdapter {
  capabilities() {
    return {
      tabs: true,
      sessions: false,
      contextMenus: false,
      sidePanel: false,
    };
  }

  async currentWindowTabs() {
    return chrome.tabs.query({ currentWindow: true });
  }

  /**
   * Closes tabs one-by-one so a single failure does not abort the rest.
   * @param {number[]} ids
   * @returns {Promise<{ closedIds: number[]; failedIds: number[] }>}
   */
  async closeTabs(ids) {
    const closedIds = [];
    const failedIds = [];
    for (const id of ids) {
      try {
        await chrome.tabs.remove(id);
        closedIds.push(id);
      } catch {
        failedIds.push(id);
      }
    }
    return { closedIds, failedIds };
  }

  /**
   * Opens a tab only after re-validating the URL as safe HTTP(S).
   * @param {{ url: string; pinned?: boolean; index?: number; active?: boolean }} options
   */
  async openTab(options) {
    const url = normalizeHttpUrl(options?.url);
    if (!url) {
      throw new Error("Refusing to open an unsafe or credential-bearing URL.");
    }
    return chrome.tabs.create({ ...options, url });
  }
}
