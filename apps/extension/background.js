import { ChromiumBrowserAdapter } from "./browser-adapter.js";
import { CaptureService } from "./core.js";
import { EntityRepository } from "./packages/local-store/index.js";
import { IndexedDbRepository } from "./repository.js";

const browser = new ChromiumBrowserAdapter();
const repository = new IndexedDbRepository();
const entities = new EntityRepository();
const service = new CaptureService({ browser, repository, entities });

const CONTEXT_MENU_ID = "tabby-capture";

async function ensureContextMenu() {
  const granted = await chrome.permissions.contains({
    permissions: ["contextMenus"],
  });
  if (!granted || !chrome.contextMenus) return;
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Capture with Tabby",
    contexts: ["page", "link"],
  });
}

void service.recoverInterrupted().catch(() => {
  // Worker start must never throw; interrupted ops retry on the next wake.
});

void ensureContextMenu().catch(() => {
  // Optional permission may be absent; popup can request it later.
});

chrome.runtime.onInstalled.addListener(() => {
  void ensureContextMenu();
});

if (chrome.permissions?.onAdded) {
  chrome.permissions.onAdded.addListener((perms) => {
    if (perms.permissions?.includes("contextMenus")) {
      void ensureContextMenu();
    }
  });
}

if (chrome.contextMenus?.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID) return;
    const linkUrl = typeof info.linkUrl === "string" ? info.linkUrl : null;
    const pageUrl =
      (typeof info.pageUrl === "string" && info.pageUrl) || tab?.url || null;
    const url = linkUrl || pageUrl;
    if (!url) return;
    const tabId = !linkUrl && Number.isInteger(tab?.id) ? tab.id : null;
    void service
      .captureContextTarget({
        commandId: crypto.randomUUID(),
        url,
        title: tab?.title ?? linkUrl ?? "Untitled",
        tabId,
      })
      .catch(() => {
        // Context-menu failures must not throw out of the SW listener.
      });
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const actions = {
    inventory: () => service.inventory(),
    capture: () => service.capture(message.payload),
    captureContextTarget: () => service.captureContextTarget(message.payload),
    undo: () => service.undo(message.commandId),
    state: async () => ({
      items: await service.repository.savedItems(),
      operations: await service.repository.operations(),
    }),
    workspaceState: () => service.workspaceState(),
    applyWorkspaceCommand: () => service.applyWorkspaceCommand(message.command),
    putWorkspaceItem: async () => {
      if (!service.entities) {
        throw new Error("Workspace organization store is unavailable.");
      }
      const item = message.item;
      if (!item || typeof item !== "object" || typeof item.id !== "string") {
        throw new Error("Workspace item is required.");
      }
      await service.entities.putItem(item);
      return item;
    },
    restore: () => service.restoreItems(message.payload),
    recover: () => service.recoverInterrupted(),
    enableContextMenus: async () => {
      const granted = await chrome.permissions.request({
        permissions: ["contextMenus"],
      });
      if (granted) await ensureContextMenu();
      return { granted };
    },
    contextMenusEnabled: async () => ({
      granted: await chrome.permissions.contains({
        permissions: ["contextMenus"],
      }),
    }),
  };
  const action = actions[message?.type];
  if (!action) return false;
  void action()
    .then((value) => sendResponse({ ok: true, value }))
    .catch((error) =>
      sendResponse({
        ok: false,
        error:
          error instanceof Error ? error.message : "Unexpected extension error",
      }),
    );
  return true;
});
