import { ChromiumBrowserAdapter } from "./browser-adapter.js";
import { CaptureService } from "./core.js";
import { IndexedDbRepository } from "./repository.js";

const service = new CaptureService({ browser: new ChromiumBrowserAdapter(), repository: new IndexedDbRepository() });

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const actions = {
    inventory: () => service.inventory(),
    capture: () => service.capture(message.payload),
    undo: () => service.undo(message.commandId),
    state: async () => ({
      items: await service.repository.savedItems(),
      operations: await service.repository.operations(),
    }),
  };
  const action = actions[message?.type];
  if (!action) return false;
  void action().then((value) => sendResponse({ ok: true, value })).catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Unexpected extension error" }));
  return true;
});
