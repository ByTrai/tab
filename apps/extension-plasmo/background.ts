/**
 * Plasmo background entry — parallel spike only.
 * Production SW remains apps/extension/background.js.
 *
 * Optional contextMenus: request via chrome.permissions, then register menu.
 */

const MENU_ID = "tabby-capture-link";

async function captureActiveTab(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    return { ok: false, error: "No active tab" };
  }
  // Plasmo spike: mark capture intent; production path uses CaptureService + IDB.
  await chrome.storage.local.set({
    "tabby.plasmo.lastCapture": {
      tabId: tab.id,
      title: tab.title ?? "Untitled",
      url: tab.url,
      at: new Date().toISOString(),
    },
  });
  try {
    await chrome.tabs.remove(tab.id);
  } catch {
    // Closing may fail on chrome:// pages; capture intent still recorded.
  }
  return { ok: true };
}

async function ensureContextMenu(): Promise<void> {
  const has = await chrome.permissions.contains({
    permissions: ["contextMenus"],
  });
  if (!has) return;
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Capture with Tabby",
    contexts: ["page", "link"],
  });
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureContextMenu();
});

chrome.permissions.onAdded?.addListener((perms) => {
  if (perms.permissions?.includes("contextMenus")) {
    void ensureContextMenu();
  }
});

chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const url = info.linkUrl || info.pageUrl || tab?.url;
  if (!url) return;
  void chrome.storage.local.set({
    "tabby.plasmo.lastCapture": {
      tabId: tab?.id ?? null,
      title: tab?.title ?? info.linkUrl ?? "Untitled",
      url,
      at: new Date().toISOString(),
      source: "contextMenu",
    },
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "tabby.captureActive") {
    void captureActiveTab().then(sendResponse);
    return true;
  }
  if (message?.type === "tabby.enableContextMenus") {
    void chrome.permissions
      .request({ permissions: ["contextMenus"] })
      .then(async (granted) => {
        if (granted) await ensureContextMenu();
        sendResponse({ ok: granted });
      });
    return true;
  }
  return false;
});
