import {
  applyCommand,
  normalizeHttpUrl,
  normalizedUrlKey,
} from "./packages/workspace-contracts/index.js";

export const RESTRICTED_PROTOCOLS = new Set([
  "about:",
  "chrome:",
  "chrome-extension:",
  "devtools:",
  "edge:",
  "file:",
  "view-source:",
]);

export const DEFAULT_WORKSPACE_TITLE = "Saved tabs";
export const DEFAULT_GROUP_TITLE = "Inbox";
export const DEFAULT_WORKSPACE_COLOR = "#0f766e";

export function classifyTab(tab) {
  if (!tab || !Number.isInteger(tab.id)) {
    return { capturable: false, reason: "This tab is no longer available." };
  }
  if (!tab.url) {
    return {
      capturable: false,
      reason: "The browser did not expose this tab's address.",
    };
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
    const normalizedUrl = normalizeHttpUrl(tab.url);
    if (!normalizedUrl) {
      return {
        capturable: false,
        reason: "Addresses containing credentials cannot be captured.",
      };
    }
    return { capturable: true, normalizedUrl };
  } catch {
    return { capturable: false, reason: "This tab has an invalid address." };
  }
}

export class CaptureService {
  constructor({
    browser,
    repository,
    entities = null,
    now = () => new Date().toISOString(),
    createId = () => crypto.randomUUID(),
  }) {
    this.browser = browser;
    this.repository = repository;
    this.entities = entities;
    this.now = now;
    this.createId = createId;
  }

  async inventory() {
    const tabs = await this.browser.currentWindowTabs();
    return tabs.map((tab) => ({ ...tab, eligibility: classifyTab(tab) }));
  }

  async capture({
    commandId,
    tabIds,
    close = false,
    duplicatePolicy = "skip",
  }) {
    if (!commandId || !Array.isArray(tabIds) || tabIds.length === 0) {
      throw new Error("Select at least one tab to save.");
    }
    const prior = await this.repository.operation(commandId);
    if (prior) return prior;

    const current = await this.browser.currentWindowTabs();
    const requested = new Set(tabIds);
    const selected = current.filter((tab) => requested.has(tab.id));
    const rejected = selected.filter((tab) => !classifyTab(tab).capturable);
    if (rejected.length > 0)
      throw new Error(`${rejected.length} selected tab(s) cannot be captured.`);

    const existingKeys = new Set(
      (await this.repository.savedItems())
        .map((item) => normalizedUrlKey(item.url))
        .filter(Boolean),
    );
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
      const createdAt = this.now();
      items.push({
        id: this.createId(),
        kind: "link",
        tabId: tab.id,
        url: eligibility.normalizedUrl,
        title: tab.title || new URL(eligibility.normalizedUrl).hostname,
        capturedAt: createdAt,
        createdAt,
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
      failedCloseIds: [],
    };

    // The single repository commit is the no-loss boundary: browser mutation is forbidden before it resolves.
    await this.repository.commitCapture(operation, items);
    await this.syncCapturedLinks(items);

    if (!close) return operation;
    const closableIds = items
      .filter((item) => !item.pinned)
      .map((item) => item.tabId);
    const closing = {
      ...operation,
      stage: "closing",
      closedTabIds: closableIds,
      failedCloseIds: [],
    };
    // Persist closure intent and the undo payload before touching the browser. Recovery can safely
    // distinguish tabs that still exist if the worker is suspended during chrome.tabs.remove.
    await this.repository.updateOperation(closing);
    if (closableIds.length === 0) {
      const closed = { ...closing, stage: "closed", closedTabIds: [] };
      await this.repository.updateOperation(closed);
      return closed;
    }

    const { closedIds, failedIds } = await this.browser.closeTabs(closableIds);
    const finished = {
      ...closing,
      closedTabIds: closedIds,
      failedCloseIds: failedIds,
      // Only claim fully closed when every intended tab actually closed.
      stage: failedIds.length === 0 ? "closed" : "closing",
    };
    await this.repository.updateOperation(finished);
    return finished;
  }

  async undo(commandId) {
    const operation = await this.repository.operation(commandId);
    if (!operation)
      throw new Error("The capture operation is no longer available.");
    if (operation.stage === "undone") return operation;

    const closed = new Set(operation.closedTabIds);
    const openTabs = await this.browser.currentWindowTabs();
    const openKeys = new Set(
      openTabs
        .filter((tab) => classifyTab(tab).capturable)
        .map((tab) => normalizedUrlKey(tab.url))
        .filter(Boolean),
    );
    let undoing = {
      ...operation,
      stage: "undoing",
      restoredItemIds: operation.restoredItemIds ?? [],
      failedRestoreIds: operation.failedRestoreIds ?? [],
    };
    await this.repository.updateOperation(undoing);
    for (const item of [...operation.items].sort((a, b) => a.index - b.index)) {
      if (
        !closed.has(item.tabId) ||
        undoing.restoredItemIds.includes(item.id) ||
        undoing.failedRestoreIds.includes(item.id) ||
        openKeys.has(normalizedUrlKey(item.url))
      )
        continue;
      const url = normalizeHttpUrl(item.url);
      if (!url) {
        undoing = {
          ...undoing,
          failedRestoreIds: [...undoing.failedRestoreIds, item.id],
        };
        await this.repository.updateOperation(undoing);
        continue;
      }
      try {
        await this.browser.openTab({
          url,
          pinned: item.pinned,
          index: item.index,
        });
        undoing = {
          ...undoing,
          restoredItemIds: [...undoing.restoredItemIds, item.id],
        };
        openKeys.add(normalizedUrlKey(url));
        await this.repository.updateOperation(undoing);
      } catch {
        undoing = {
          ...undoing,
          failedRestoreIds: [...undoing.failedRestoreIds, item.id],
        };
        await this.repository.updateOperation(undoing);
      }
    }
    await this.repository.removeItems(operation.items.map((item) => item.id));
    const undone = { ...undoing, stage: "undone", undoneAt: this.now() };
    await this.repository.updateOperation(undone);
    return undone;
  }

  /**
   * Finishes operations interrupted while closing tabs or undoing a capture.
   * Safe to call on every service-worker start.
   */
  async recoverInterrupted() {
    const operations = await this.repository.operations();
    const recovered = [];
    for (const operation of operations) {
      if (operation.stage === "closing") {
        recovered.push(await this.recoverClosing(operation));
      } else if (operation.stage === "undoing") {
        recovered.push(await this.undo(operation.id));
      }
    }
    return recovered;
  }

  async recoverClosing(operation) {
    const openTabs = await this.browser.currentWindowTabs();
    const openIds = new Set(openTabs.map((tab) => tab.id));
    const intended = uniqueIds([
      ...(operation.closedTabIds ?? []),
      ...(operation.failedCloseIds ?? []),
    ]);

    const gone = intended.filter((id) => !openIds.has(id));
    const stillOpen = intended.filter((id) => openIds.has(id));

    if (stillOpen.length === 0) {
      const closed = {
        ...operation,
        stage: "closed",
        closedTabIds: gone,
        failedCloseIds: [],
      };
      await this.repository.updateOperation(closed);
      return closed;
    }

    const { closedIds, failedIds } = await this.browser.closeTabs(stillOpen);
    const finished = {
      ...operation,
      closedTabIds: uniqueIds([...gone, ...closedIds]),
      failedCloseIds: failedIds,
      stage: failedIds.length === 0 ? "closed" : "closing",
    };
    await this.repository.updateOperation(finished);
    return finished;
  }

  /**
   * Opens saved link items by id. Reports partial failures and never claims
   * full success when any requested open failed.
   */
  async restoreItems({
    commandId,
    itemIds,
    duplicatePolicy = "skip",
  }) {
    if (!commandId || !Array.isArray(itemIds) || itemIds.length === 0) {
      throw new Error("Select at least one saved link to restore.");
    }

    const byId = await this.collectLinkItemsById();
    const openTabs = await this.browser.currentWindowTabs();
    const openKeys = new Set(
      openTabs
        .map((tab) => normalizedUrlKey(tab.url))
        .filter(Boolean),
    );

    const openedIds = [];
    const failedIds = [];
    const skippedIds = [];
    const blockedIds = [];

    for (const itemId of itemIds) {
      const item = byId.get(itemId);
      if (!item) {
        failedIds.push(itemId);
        continue;
      }
      const url = normalizeHttpUrl(item.url);
      if (!url) {
        blockedIds.push(itemId);
        failedIds.push(itemId);
        continue;
      }
      const key = normalizedUrlKey(url);
      if (duplicatePolicy === "skip" && openKeys.has(key)) {
        skippedIds.push(itemId);
        continue;
      }
      try {
        await this.browser.openTab({ url, active: false });
        openedIds.push(itemId);
        openKeys.add(key);
      } catch {
        failedIds.push(itemId);
      }
    }

    return {
      commandId,
      openedIds,
      failedIds,
      skippedIds,
      blockedIds,
      ok: failedIds.length === 0,
    };
  }

  async workspaceState() {
    if (!this.entities) {
      return {
        workspaces: [],
        groups: [],
        items: [],
        trash: [],
        operations: [],
        meta: { operationOrder: [] },
      };
    }
    return this.entities.getAll();
  }

  async applyWorkspaceCommand(command) {
    if (!this.entities) {
      throw new Error("Workspace organization store is unavailable.");
    }
    if (!command || typeof command !== "object") {
      throw new Error("Workspace command is required.");
    }

    if (command.type === "trashItem") {
      const state = await this.entities.loadExport();
      const applied = applyCommand(
        { state, now: this.now, createId: this.createId },
        command,
      );
      await this.entities.trashItem(command.itemId, {
        deletedAt: applied.result.deletedAt,
      });
      return applied;
    }

    if (command.type === "restoreItem") {
      const trash = await this.entities.listTrash();
      const record = trash.find((entry) => entry.entityId === command.itemId);
      if (!record) throw new Error("Trashed item was not found.");
      const state = await this.entities.loadExport();
      const trashBundle = {
        items: trash
          .filter((entry) => entry.entityType === "item")
          .map((entry) => entry.snapshot),
        tombstones: trash.map((entry) => ({
          id: entry.id,
          entityId: entry.entityId,
          entityType: entry.entityType,
          deletedAt: entry.deletedAt,
        })),
      };
      const applied = applyCommand(
        { state, trash: trashBundle, now: this.now, createId: this.createId },
        command,
      );
      await this.entities.restoreFromTrash(record.id);
      if (applied.result?.item) {
        await this.entities.putItem(applied.result.item);
      }
      return applied;
    }

    const state = await this.entities.loadExport();
    const applied = applyCommand(
      { state, now: this.now, createId: this.createId },
      command,
    );

    if (command.type === "createWorkspace" || command.type === "renameWorkspace" || command.type === "archiveWorkspace") {
      await this.entities.putWorkspace(applied.result.workspace);
    } else if (command.type === "createGroup" || command.type === "renameGroup") {
      await this.entities.putGroup(applied.result.group);
    } else if (command.type === "createItem" || command.type === "toggleTask" || command.type === "moveItem") {
      await this.entities.putItem(applied.result.item);
    } else if (command.type === "importExport") {
      await this.entities.replaceFromExport(applied.state);
    } else {
      // reorderEntity and other mutations: persist the full export snapshot.
      await this.entities.replaceFromExport(applied.state);
    }
    return applied;
  }

  async ensureDefaultInbox() {
    if (!this.entities) return null;
    let snapshot = await this.entities.loadExport();
    let workspace = snapshot.workspaces.find(
      (entry) => entry.title === DEFAULT_WORKSPACE_TITLE && !entry.archived,
    );
    if (!workspace) {
      const applied = applyCommand(
        { state: snapshot, now: this.now, createId: this.createId },
        {
          type: "createWorkspace",
          commandId: `ws-default:${this.createId()}`,
          title: DEFAULT_WORKSPACE_TITLE,
          color: DEFAULT_WORKSPACE_COLOR,
        },
      );
      workspace = applied.result.workspace;
      await this.entities.putWorkspace(workspace);
      snapshot = applied.state;
    }

    let group = snapshot.groups.find(
      (entry) =>
        entry.workspaceId === workspace.id &&
        entry.title === DEFAULT_GROUP_TITLE,
    );
    if (!group) {
      const applied = applyCommand(
        { state: snapshot, now: this.now, createId: this.createId },
        {
          type: "createGroup",
          commandId: `grp-default:${this.createId()}`,
          workspaceId: workspace.id,
          title: DEFAULT_GROUP_TITLE,
        },
      );
      group = applied.result.group;
      await this.entities.putGroup(group);
    }
    return { workspace, group };
  }

  async syncCapturedLinks(items) {
    if (!this.entities || !Array.isArray(items) || items.length === 0) return;
    const inbox = await this.ensureDefaultInbox();
    if (!inbox) return;

    const existing = await this.entities.savedLinkItems();
    const existingIds = new Set(existing.map((item) => item.id));
    const existingKeys = new Set(
      existing.map((item) => normalizedUrlKey(item.url)).filter(Boolean),
    );

    for (const item of items) {
      if (existingIds.has(item.id)) continue;
      const url = normalizeHttpUrl(item.url);
      if (!url) continue;
      const key = normalizedUrlKey(url);
      if (existingKeys.has(key)) continue;

      const state = await this.entities.loadExport();
      const applied = applyCommand(
        { state, now: this.now, createId: this.createId },
        {
          type: "createItem",
          commandId: `capture-sync:${item.id}`,
          id: item.id,
          groupId: inbox.group.id,
          kind: "link",
          title: item.title,
          url,
          createdAt: item.createdAt,
        },
      );
      await this.entities.putItem(applied.result.item);
      existingIds.add(item.id);
      existingKeys.add(key);
    }
  }

  async collectLinkItemsById() {
    const byId = new Map();
    for (const item of await this.repository.savedItems()) {
      if (item?.id) byId.set(item.id, item);
    }
    if (this.entities) {
      for (const item of await this.entities.savedLinkItems()) {
        if (item?.id) byId.set(item.id, item);
      }
    }
    return byId;
  }
}

/** @param {number[]} ids */
function uniqueIds(ids) {
  return [...new Set(ids)];
}
