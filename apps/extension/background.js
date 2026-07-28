import { ChromiumBrowserAdapter } from "./browser-adapter.js";
import { CaptureService } from "./core.js";
import { EntityRepository } from "./packages/local-store/index.js";
import { IndexedDbRepository } from "./repository.js";

const browser = new ChromiumBrowserAdapter();
const repository = new IndexedDbRepository();
const entities = new EntityRepository();
const service = new CaptureService({ browser, repository, entities });

void service.recoverInterrupted().catch(() => {
  // Worker start must never throw; interrupted ops retry on the next wake.
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const actions = {
    inventory: () => service.inventory(),
    capture: () => service.capture(message.payload),
    undo: () => service.undo(message.commandId),
    state: async () => ({
      items: await service.repository.savedItems(),
      operations: await service.repository.operations(),
    }),
    workspaceState: () => service.workspaceState(),
    applyWorkspaceCommand: () => service.applyWorkspaceCommand(message.command),
    restore: () => service.restoreItems(message.payload),
    recover: () => service.recoverInterrupted(),
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
