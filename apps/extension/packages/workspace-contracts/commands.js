/**
 * Pure in-memory workspace commands. No IndexedDB, chrome, or React.
 */

import {
  CONTRACT_LIMITS,
  ITEM_KINDS,
  WORKSPACE_EXPORT_SCHEMA_VERSION,
  isClientId,
  isUtcTimestamp,
  migrateWorkspaceExport,
  normalizeHttpUrl,
  orderBetween,
  serializeWorkspaceExport,
} from "./index.js";

export const COMMAND_LOG_LIMIT = 200;

/** @typedef {import("./index.js").WorkspaceExportV2} WorkspaceExportV2 */
/** @typedef {import("./index.js").CanonicalWorkspace} CanonicalWorkspace */
/** @typedef {import("./index.js").CanonicalGroup} CanonicalGroup */
/** @typedef {import("./index.js").CanonicalItem} CanonicalItem */
/** @typedef {import("./index.js").OrderedEntity} OrderedEntity */
/** @typedef {import("./index.js").Tombstone} Tombstone */
/** @typedef {import("./index.js").ItemKind} ItemKind */

/**
 * @typedef {"validation" | "quota" | "corruption" | "permission" | "partial_failure" | "unsupported" | "not_found" | "conflict"} DomainErrorCategory
 */

/**
 * Typed domain failure. Callers map `category` to UI/recovery without parsing messages.
 */
export class DomainError extends Error {
  /**
   * @param {DomainErrorCategory} category
   * @param {string} message
   * @param {{ code?: string; cause?: unknown }} [options]
   */
  constructor(category, message, options = {}) {
    super(
      message,
      options.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = "DomainError";
    this.category = category;
    this.code = options.code;
  }
}

/**
 * @typedef {object} CommandLogEntry
 * @property {string} commandId
 * @property {string} type
 * @property {string} appliedAt
 * @property {unknown} result
 */

/**
 * @typedef {object} TrashBundle
 * @property {CanonicalItem[]} items
 * @property {Tombstone[]} tombstones
 */

/**
 * @typedef {object} CommandContext
 * @property {WorkspaceExportV2} state
 * @property {TrashBundle} [trash]
 * @property {CommandLogEntry[]} [commandLog]
 * @property {() => string} [now]
 * @property {() => string} [createId]
 */

/**
 * @typedef {object} ApplyCommandResult
 * @property {WorkspaceExportV2} state
 * @property {TrashBundle} trash
 * @property {CommandLogEntry[]} commandLog
 * @property {unknown} result
 */

/**
 * Deterministically reassigns `order` to 0..n-1 after sorting by current order, then id.
 * @template {OrderedEntity} T
 * @param {readonly T[]} entities
 * @returns {T[]}
 */
export function rebalanceOrders(entities) {
  return [...entities]
    .sort((left, right) =>
      left.order === right.order
        ? left.id.localeCompare(right.id)
        : left.order - right.order,
    )
    .map((entity, index) => ({ ...entity, order: index }));
}

/**
 * Apply one workspace command to an in-memory snapshot.
 * Same `commandId` is a no-op that returns the prior result.
 *
 * @param {CommandContext} context
 * @param {WorkspaceCommand} command
 * @returns {ApplyCommandResult}
 */
export function applyCommand(context, command) {
  if (!isRecord(command) || typeof command.type !== "string") {
    throw new DomainError("validation", "Command type is required.");
  }
  if (!isClientId(command.commandId)) {
    throw new DomainError(
      "validation",
      "commandId is required for idempotency.",
    );
  }

  const trash = normalizeTrash(context.trash);
  const commandLog = Array.isArray(context.commandLog)
    ? context.commandLog.map(cloneLogEntry)
    : [];
  const prior = commandLog.find(
    (entry) => entry.commandId === command.commandId,
  );
  if (prior) {
    return {
      state: cloneState(context.state),
      trash,
      commandLog,
      result: structuredClone(prior.result),
    };
  }

  const now = resolveNow(context.now);
  const state = cloneState(context.state);
  const result = dispatch(state, trash, command, now, context.createId);
  const entry = {
    commandId: command.commandId,
    type: command.type,
    appliedAt: now,
    result: structuredClone(result),
  };
  const nextLog = [...commandLog, entry];
  if (nextLog.length > COMMAND_LOG_LIMIT) {
    nextLog.splice(0, nextLog.length - COMMAND_LOG_LIMIT);
  }
  return { state, trash, commandLog: nextLog, result };
}

/**
 * In-memory repository facade for tests and future IndexedDB adapters.
 */
export class InMemoryWorkspaceRepository {
  /**
   * @param {{ state?: WorkspaceExportV2; trash?: TrashBundle; commandLog?: CommandLogEntry[] }} [seed]
   */
  constructor(seed = {}) {
    this._snapshot = {
      state: cloneState(seed.state ?? emptyState()),
      trash: normalizeTrash(seed.trash),
      commandLog: Array.isArray(seed.commandLog)
        ? seed.commandLog.map(cloneLogEntry)
        : [],
    };
  }

  async load() {
    return {
      state: cloneState(this._snapshot.state),
      trash: normalizeTrash(this._snapshot.trash),
      commandLog: this._snapshot.commandLog.map(cloneLogEntry),
    };
  }

  /** @param {{ state: WorkspaceExportV2; trash: TrashBundle; commandLog: CommandLogEntry[] }} snapshot */
  async save(snapshot) {
    this._snapshot = {
      state: cloneState(snapshot.state),
      trash: normalizeTrash(snapshot.trash),
      commandLog: snapshot.commandLog.map(cloneLogEntry),
    };
  }

  /**
   * Load → apply → save in one step (no durability guarantees beyond memory).
   * @param {WorkspaceCommand} command
   * @param {{ now?: () => string; createId?: () => string }} [options]
   */
  async execute(command, options = {}) {
    const current = await this.load();
    const applied = applyCommand(
      {
        state: current.state,
        trash: current.trash,
        commandLog: current.commandLog,
        now: options.now,
        createId: options.createId,
      },
      command,
    );
    await this.save({
      state: applied.state,
      trash: applied.trash,
      commandLog: applied.commandLog,
    });
    return applied;
  }
}

/** @returns {WorkspaceExportV2} */
function emptyState() {
  return {
    schemaVersion: WORKSPACE_EXPORT_SCHEMA_VERSION,
    workspaces: [],
    groups: [],
    items: [],
  };
}

/**
 * @param {WorkspaceExportV2} state
 * @param {TrashBundle} trash
 * @param {WorkspaceCommand} command
 * @param {string} now
 * @param {(() => string) | undefined} createId
 */
function dispatch(state, trash, command, now, createId) {
  switch (command.type) {
    case "createWorkspace":
      return createWorkspace(state, command, createId);
    case "renameWorkspace":
      return renameWorkspace(state, command);
    case "archiveWorkspace":
      return archiveWorkspace(state, command);
    case "createGroup":
      return createGroup(state, command, createId);
    case "renameGroup":
      return renameGroup(state, command);
    case "moveItem":
      return moveItem(state, command);
    case "trashItem":
      return trashItem(state, trash, command, now, createId);
    case "restoreItem":
      return restoreItem(state, trash, command);
    case "createItem":
      return createItem(state, command, now, createId);
    case "toggleTask":
      return toggleTask(state, command);
    case "reorderEntity":
      return reorderEntity(state, command);
    case "importExport":
      return importExport(state, command);
    case "exportSnapshot":
      return exportSnapshot(state);
    default:
      throw new DomainError(
        "unsupported",
        `Unsupported command type: ${String(/** @type {{ type?: unknown }} */ (command).type)}`,
        { code: "unsupported_command" },
      );
  }
}

/** @param {WorkspaceExportV2} state @param {CreateWorkspaceCommand} command */
function createWorkspace(state, command, createId) {
  const id = requireId(
    command.id ?? (createId ? createId() : undefined),
    "workspace",
  );
  assertUniqueId(state, id);
  if (state.workspaces.length >= CONTRACT_LIMITS.workspaces) {
    throw new DomainError("quota", "Workspace limit reached.", {
      code: "workspaces_quota",
    });
  }
  const title = requireText(
    command.title,
    1,
    CONTRACT_LIMITS.workspaceTitle,
    "workspace title",
  );
  const color = requireColor(command.color);
  const order = nextAppendOrder(state.workspaces);
  const workspace = { id, title, color, archived: false, order };
  state.workspaces = [...state.workspaces, workspace];
  return { workspace };
}

/** @param {WorkspaceExportV2} state @param {RenameWorkspaceCommand} command */
function renameWorkspace(state, command) {
  const index = findIndex(state.workspaces, command.workspaceId, "workspace");
  const title = requireText(
    command.title,
    1,
    CONTRACT_LIMITS.workspaceTitle,
    "workspace title",
  );
  const workspace = { ...state.workspaces[index], title };
  state.workspaces = replaceAt(state.workspaces, index, workspace);
  return { workspace };
}

/** @param {WorkspaceExportV2} state @param {ArchiveWorkspaceCommand} command */
function archiveWorkspace(state, command) {
  const index = findIndex(state.workspaces, command.workspaceId, "workspace");
  if (typeof command.archived !== "boolean") {
    throw new DomainError("validation", "archived must be a boolean.");
  }
  const workspace = { ...state.workspaces[index], archived: command.archived };
  state.workspaces = replaceAt(state.workspaces, index, workspace);
  return { workspace };
}

/** @param {WorkspaceExportV2} state @param {CreateGroupCommand} command */
function createGroup(state, command, createId) {
  const id = requireId(
    command.id ?? (createId ? createId() : undefined),
    "group",
  );
  assertUniqueId(state, id);
  requireId(command.workspaceId, "workspace");
  if (
    !state.workspaces.some((workspace) => workspace.id === command.workspaceId)
  ) {
    throw new DomainError("not_found", "Workspace was not found.", {
      code: "workspace_not_found",
    });
  }
  if (state.groups.length >= CONTRACT_LIMITS.groups) {
    throw new DomainError("quota", "Group limit reached.", {
      code: "groups_quota",
    });
  }
  const title = requireText(
    command.title,
    1,
    CONTRACT_LIMITS.groupTitle,
    "group title",
  );
  const siblings = state.groups.filter(
    (group) => group.workspaceId === command.workspaceId,
  );
  const { order, collection } = insertOrder(
    siblings,
    command.beforeId,
    command.afterId,
  );
  if (collection !== siblings) {
    state.groups = replaceCollection(state.groups, siblings, collection);
  }
  const group = {
    id,
    workspaceId: command.workspaceId,
    title,
    collapsed: false,
    order,
  };
  state.groups = [...state.groups, group];
  return { group };
}

/** @param {WorkspaceExportV2} state @param {RenameGroupCommand} command */
function renameGroup(state, command) {
  const index = findIndex(state.groups, command.groupId, "group");
  const title = requireText(
    command.title,
    1,
    CONTRACT_LIMITS.groupTitle,
    "group title",
  );
  const group = { ...state.groups[index], title };
  state.groups = replaceAt(state.groups, index, group);
  return { group };
}

/** @param {WorkspaceExportV2} state @param {MoveItemCommand} command */
function moveItem(state, command) {
  const index = findIndex(state.items, command.itemId, "item");
  requireId(command.groupId, "group");
  if (!state.groups.some((group) => group.id === command.groupId)) {
    throw new DomainError("not_found", "Group was not found.", {
      code: "group_not_found",
    });
  }
  const current = state.items[index];
  const without = state.items.filter((item) => item.id !== current.id);
  const siblings = without.filter((item) => item.groupId === command.groupId);
  const { order, collection } = insertOrder(
    siblings,
    command.beforeId,
    command.afterId,
  );
  let nextItems = without;
  if (collection !== siblings) {
    nextItems = replaceCollection(without, siblings, collection);
  }
  const item = { ...current, groupId: command.groupId, order };
  state.items = [...nextItems, item];
  return { item };
}

/**
 * @param {WorkspaceExportV2} state
 * @param {TrashBundle} trash
 * @param {TrashItemCommand} command
 * @param {string} now
 */
function trashItem(state, trash, command, now, createId) {
  const index = findIndex(state.items, command.itemId, "item");
  const item = state.items[index];
  state.items = state.items.filter((_, itemIndex) => itemIndex !== index);
  trash.items = [...trash.items.filter((entry) => entry.id !== item.id), item];
  const tombstoneId =
    command.tombstoneId ?? (createId ? createId() : `tombstone:${item.id}`);
  trash.tombstones = [
    ...trash.tombstones.filter((entry) => entry.entityId !== item.id),
    {
      id: requireId(tombstoneId, "tombstone"),
      entityId: item.id,
      entityType: "item",
      deletedAt: now,
    },
  ];
  return { itemId: item.id, deletedAt: now };
}

/**
 * @param {WorkspaceExportV2} state
 * @param {TrashBundle} trash
 * @param {RestoreItemCommand} command
 */
function restoreItem(state, trash, command) {
  const trashIndex = trash.items.findIndex(
    (item) => item.id === command.itemId,
  );
  if (trashIndex < 0) {
    throw new DomainError("not_found", "Trashed item was not found.", {
      code: "trash_not_found",
    });
  }
  const item = trash.items[trashIndex];
  trash.items = trash.items.filter((_, itemIndex) => itemIndex !== trashIndex);
  trash.tombstones = trash.tombstones.filter(
    (entry) => entry.entityId !== item.id,
  );

  const groupId = command.groupId ?? item.groupId;
  requireId(groupId, "group");
  if (!state.groups.some((group) => group.id === groupId)) {
    throw new DomainError("not_found", "Group was not found.", {
      code: "group_not_found",
    });
  }
  if (state.items.some((entry) => entry.id === item.id)) {
    throw new DomainError("conflict", "Item already exists in the workspace.", {
      code: "item_conflict",
    });
  }
  if (state.items.length >= CONTRACT_LIMITS.items) {
    throw new DomainError("quota", "Item limit reached.", {
      code: "items_quota",
    });
  }

  const siblings = state.items.filter((entry) => entry.groupId === groupId);
  const { order, collection } = insertOrder(
    siblings,
    command.beforeId,
    command.afterId,
  );
  if (collection !== siblings) {
    state.items = replaceCollection(state.items, siblings, collection);
  }
  const restored = { ...item, groupId, order };
  state.items = [...state.items, restored];
  return { item: restored };
}

/** @param {WorkspaceExportV2} state @param {CreateItemCommand} command @param {string} now */
function createItem(state, command, now, createId) {
  const id = requireId(
    command.id ?? (createId ? createId() : undefined),
    "item",
  );
  assertUniqueId(state, id);
  requireId(command.groupId, "group");
  if (!state.groups.some((group) => group.id === command.groupId)) {
    throw new DomainError("not_found", "Group was not found.", {
      code: "group_not_found",
    });
  }
  if (state.items.length >= CONTRACT_LIMITS.items) {
    throw new DomainError("quota", "Item limit reached.", {
      code: "items_quota",
    });
  }
  if (!ITEM_KINDS.includes(command.kind)) {
    throw new DomainError("validation", "Item kind is invalid.");
  }
  const title = requireText(
    command.title ?? "",
    0,
    CONTRACT_LIMITS.itemTitle,
    "item title",
  );
  const createdAt =
    command.createdAt !== undefined
      ? requireTimestamp(command.createdAt, "item createdAt")
      : now;
  const siblings = state.items.filter(
    (item) => item.groupId === command.groupId,
  );
  const { order, collection } = insertOrder(
    siblings,
    command.beforeId,
    command.afterId,
  );
  if (collection !== siblings) {
    state.items = replaceCollection(state.items, siblings, collection);
  }

  /** @type {CanonicalItem} */
  let item;
  if (command.kind === "link") {
    const url = normalizeHttpUrl(command.url);
    if (!url) {
      throw new DomainError("validation", "Link URL is invalid.", {
        code: "invalid_url",
      });
    }
    item = {
      id,
      groupId: command.groupId,
      kind: "link",
      title,
      url,
      createdAt,
      order,
    };
  } else {
    const content = requireText(
      command.content ?? "",
      0,
      CONTRACT_LIMITS.content,
      "item content",
    );
    item =
      command.kind === "task"
        ? {
            id,
            groupId: command.groupId,
            kind: "task",
            title,
            content,
            completed: Boolean(command.completed),
            createdAt,
            order,
          }
        : {
            id,
            groupId: command.groupId,
            kind: "note",
            title,
            content,
            createdAt,
            order,
          };
  }
  state.items = [...state.items, item];
  return { item };
}

/** @param {WorkspaceExportV2} state @param {ToggleTaskCommand} command */
function toggleTask(state, command) {
  const index = findIndex(state.items, command.itemId, "item");
  const current = state.items[index];
  if (current.kind !== "task") {
    throw new DomainError("validation", "Only tasks can be toggled.", {
      code: "not_a_task",
    });
  }
  const completed =
    typeof command.completed === "boolean"
      ? command.completed
      : !current.completed;
  const item = { ...current, completed };
  state.items = replaceAt(state.items, index, item);
  return { item };
}

/** @param {WorkspaceExportV2} state @param {ReorderEntityCommand} command */
function reorderEntity(state, command) {
  if (
    command.entityType !== "workspace" &&
    command.entityType !== "group" &&
    command.entityType !== "item"
  ) {
    throw new DomainError("validation", "entityType is invalid.");
  }

  if (command.entityType === "workspace") {
    const index = findIndex(state.workspaces, command.entityId, "workspace");
    const current = state.workspaces[index];
    const without = state.workspaces.filter((entry) => entry.id !== current.id);
    const { order, collection } = insertOrder(
      without,
      command.beforeId,
      command.afterId,
    );
    state.workspaces = [...collection, { ...current, order }];
    return { entityType: "workspace", entityId: current.id, order };
  }

  if (command.entityType === "group") {
    const index = findIndex(state.groups, command.entityId, "group");
    const current = state.groups[index];
    const without = state.groups.filter((entry) => entry.id !== current.id);
    const siblings = without.filter(
      (entry) => entry.workspaceId === current.workspaceId,
    );
    const { order, collection } = insertOrder(
      siblings,
      command.beforeId,
      command.afterId,
    );
    let next = without;
    if (collection !== siblings)
      next = replaceCollection(without, siblings, collection);
    state.groups = [...next, { ...current, order }];
    return { entityType: "group", entityId: current.id, order };
  }

  const index = findIndex(state.items, command.entityId, "item");
  const current = state.items[index];
  const without = state.items.filter((entry) => entry.id !== current.id);
  const siblings = without.filter((entry) => entry.groupId === current.groupId);
  const { order, collection } = insertOrder(
    siblings,
    command.beforeId,
    command.afterId,
  );
  let next = without;
  if (collection !== siblings)
    next = replaceCollection(without, siblings, collection);
  state.items = [...next, { ...current, order }];
  return { entityType: "item", entityId: current.id, order };
}

/** @param {WorkspaceExportV2} state @param {ImportExportCommand} command */
function importExport(state, command) {
  let migrated;
  try {
    migrated = migrateWorkspaceExport(command.payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Import payload is invalid.";
    if (/Unsupported/.test(message)) {
      throw new DomainError("unsupported", message, {
        code: "unsupported_schema",
        cause: error,
      });
    }
    if (/exceed the supported limit/.test(message)) {
      throw new DomainError("quota", message, {
        code: "import_quota",
        cause: error,
      });
    }
    if (/Duplicate|unknown|invalid|must be/i.test(message)) {
      throw new DomainError("validation", message, {
        code: "import_invalid",
        cause: error,
      });
    }
    throw new DomainError("corruption", message, {
      code: "import_corrupt",
      cause: error,
    });
  }
  state.schemaVersion = migrated.schemaVersion;
  state.workspaces = migrated.workspaces;
  state.groups = migrated.groups;
  state.items = migrated.items;
  return {
    workspaceCount: state.workspaces.length,
    groupCount: state.groups.length,
    itemCount: state.items.length,
  };
}

/** @param {WorkspaceExportV2} state */
function exportSnapshot(state) {
  const canonical = migrateWorkspaceExport(state);
  return {
    snapshot: canonical,
    serialized: serializeWorkspaceExport(canonical),
  };
}

/**
 * @template {OrderedEntity} T
 * @param {T[]} siblings
 * @param {string | null | undefined} beforeId
 * @param {string | null | undefined} afterId
 * @returns {{ order: number; collection: T[] }}
 */
function insertOrder(siblings, beforeId, afterId) {
  const sorted = sortByOrder(siblings);
  const hasBefore = beforeId != null;
  const hasAfter = afterId != null;

  if (!hasBefore && !hasAfter) {
    return { order: nextAppendOrder(siblings), collection: siblings };
  }

  const before = hasBefore ? requireSibling(sorted, beforeId).order : null;
  const after = hasAfter ? requireSibling(sorted, afterId).order : null;

  try {
    return { order: orderBetween(before, after), collection: siblings };
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !/precision is exhausted/.test(error.message)
    ) {
      if (error instanceof Error && /ascending|invalid/.test(error.message)) {
        throw new DomainError("validation", error.message, { cause: error });
      }
      throw error;
    }
    const rebalanced = rebalanceOrders(siblings);
    const beforeOrder = hasBefore
      ? requireSibling(rebalanced, beforeId).order
      : null;
    const afterOrder = hasAfter
      ? requireSibling(rebalanced, afterId).order
      : null;
    try {
      return {
        order: orderBetween(beforeOrder, afterOrder),
        collection: rebalanced,
      };
    } catch (retryError) {
      throw new DomainError(
        "corruption",
        retryError instanceof Error
          ? retryError.message
          : "Could not assign order.",
        { code: "order_exhausted", cause: retryError },
      );
    }
  }
}

/** @template {OrderedEntity} T @param {readonly T[]} entities */
function sortByOrder(entities) {
  return [...entities].sort((left, right) =>
    left.order === right.order
      ? left.id.localeCompare(right.id)
      : left.order - right.order,
  );
}

/** @template {OrderedEntity} T @param {T[]} sorted @param {string} id */
function requireSibling(sorted, id) {
  const found = sorted.find((entry) => entry.id === id);
  if (!found) {
    throw new DomainError("not_found", "Order neighbor was not found.", {
      code: "neighbor_not_found",
    });
  }
  return found;
}

/** @param {unknown} trash @returns {TrashBundle} */
function normalizeTrash(trash) {
  if (trash == null) return { items: [], tombstones: [] };
  if (
    !isRecord(trash) ||
    !Array.isArray(trash.items) ||
    !Array.isArray(trash.tombstones)
  ) {
    throw new DomainError("corruption", "Trash bundle is invalid.");
  }
  return {
    items: trash.items.map((item) => structuredClone(item)),
    tombstones: trash.tombstones.map((entry) => structuredClone(entry)),
  };
}

/** @param {WorkspaceExportV2 | undefined} state */
function cloneState(state) {
  if (!state) return emptyState();
  return {
    schemaVersion: WORKSPACE_EXPORT_SCHEMA_VERSION,
    workspaces: state.workspaces.map((entry) => ({ ...entry })),
    groups: state.groups.map((entry) => ({ ...entry })),
    items: state.items.map((entry) => structuredClone(entry)),
  };
}

/** @param {CommandLogEntry} entry */
function cloneLogEntry(entry) {
  return {
    commandId: entry.commandId,
    type: entry.type,
    appliedAt: entry.appliedAt,
    result: structuredClone(entry.result),
  };
}

/** @param {(() => string) | undefined} now */
function resolveNow(now) {
  const value = now ? now() : new Date().toISOString();
  if (!isUtcTimestamp(value)) {
    throw new DomainError(
      "validation",
      "now() must return a canonical UTC timestamp.",
    );
  }
  return value;
}

/** @param {WorkspaceExportV2} state @param {string} id */
function assertUniqueId(state, id) {
  if (
    state.workspaces.some((entry) => entry.id === id) ||
    state.groups.some((entry) => entry.id === id) ||
    state.items.some((entry) => entry.id === id)
  ) {
    throw new DomainError("conflict", `Duplicate entity ID: ${id}`, {
      code: "duplicate_id",
    });
  }
}

/** @template {{ id: string }} T @param {T[]} list @param {string} id @param {string} name */
function findIndex(list, id, name) {
  requireId(id, name);
  const index = list.findIndex((entry) => entry.id === id);
  if (index < 0) {
    throw new DomainError("not_found", `${capitalize(name)} was not found.`, {
      code: `${name}_not_found`,
    });
  }
  return index;
}

/** @param {unknown} value @param {string} name */
function requireId(value, name) {
  if (!isClientId(value)) {
    throw new DomainError("validation", `${capitalize(name)} ID is invalid.`);
  }
  return /** @type {string} */ (value);
}

/** @param {unknown} value @param {number} minimum @param {number} maximum @param {string} name */
function requireText(value, minimum, maximum, name) {
  if (
    typeof value !== "string" ||
    value.length < minimum ||
    value.length > maximum
  ) {
    throw new DomainError("validation", `${name} is invalid.`);
  }
  return value;
}

/** @param {unknown} value */
function requireColor(value) {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new DomainError("validation", "Workspace color is invalid.");
  }
  return value.toLowerCase();
}

/** @param {unknown} value @param {string} name */
function requireTimestamp(value, name) {
  if (!isUtcTimestamp(value)) {
    throw new DomainError(
      "validation",
      `${name} must be a canonical UTC timestamp.`,
    );
  }
  return value;
}

/** @template {OrderedEntity} T @param {T[]} entities */
function nextAppendOrder(entities) {
  if (entities.length === 0) return 0;
  const max = entities.reduce(
    (highest, entry) => Math.max(highest, entry.order),
    -Infinity,
  );
  try {
    return orderBetween(max, null);
  } catch {
    return entities.length;
  }
}

/** @template T @param {T[]} list @param {number} index @param {T} value */
function replaceAt(list, index, value) {
  return [...list.slice(0, index), value, ...list.slice(index + 1)];
}

/**
 * @template {OrderedEntity} T
 * @param {T[]} all
 * @param {T[]} previousSiblings
 * @param {T[]} nextSiblings
 */
function replaceCollection(all, previousSiblings, nextSiblings) {
  const previousIds = new Set(previousSiblings.map((entry) => entry.id));
  const replacements = new Map(nextSiblings.map((entry) => [entry.id, entry]));
  return all.map((entry) =>
    previousIds.has(entry.id)
      ? /** @type {T} */ (replacements.get(entry.id) ?? entry)
      : entry,
  );
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @param {string} value */
function capitalize(value) {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

/**
 * @typedef {object} CreateWorkspaceCommand
 * @property {"createWorkspace"} type
 * @property {string} commandId
 * @property {string} [id]
 * @property {string} title
 * @property {string} color
 */

/**
 * @typedef {object} RenameWorkspaceCommand
 * @property {"renameWorkspace"} type
 * @property {string} commandId
 * @property {string} workspaceId
 * @property {string} title
 */

/**
 * @typedef {object} ArchiveWorkspaceCommand
 * @property {"archiveWorkspace"} type
 * @property {string} commandId
 * @property {string} workspaceId
 * @property {boolean} archived
 */

/**
 * @typedef {object} CreateGroupCommand
 * @property {"createGroup"} type
 * @property {string} commandId
 * @property {string} [id]
 * @property {string} workspaceId
 * @property {string} title
 * @property {string | null} [beforeId]
 * @property {string | null} [afterId]
 */

/**
 * @typedef {object} RenameGroupCommand
 * @property {"renameGroup"} type
 * @property {string} commandId
 * @property {string} groupId
 * @property {string} title
 */

/**
 * @typedef {object} MoveItemCommand
 * @property {"moveItem"} type
 * @property {string} commandId
 * @property {string} itemId
 * @property {string} groupId
 * @property {string | null} [beforeId]
 * @property {string | null} [afterId]
 */

/**
 * @typedef {object} TrashItemCommand
 * @property {"trashItem"} type
 * @property {string} commandId
 * @property {string} itemId
 * @property {string} [tombstoneId]
 */

/**
 * @typedef {object} RestoreItemCommand
 * @property {"restoreItem"} type
 * @property {string} commandId
 * @property {string} itemId
 * @property {string} [groupId]
 * @property {string | null} [beforeId]
 * @property {string | null} [afterId]
 */

/**
 * @typedef {object} CreateItemCommand
 * @property {"createItem"} type
 * @property {string} commandId
 * @property {string} [id]
 * @property {string} groupId
 * @property {ItemKind} kind
 * @property {string} [title]
 * @property {string} [url]
 * @property {string} [content]
 * @property {boolean} [completed]
 * @property {string} [createdAt]
 * @property {string | null} [beforeId]
 * @property {string | null} [afterId]
 */

/**
 * @typedef {object} ToggleTaskCommand
 * @property {"toggleTask"} type
 * @property {string} commandId
 * @property {string} itemId
 * @property {boolean} [completed]
 */

/**
 * @typedef {object} ReorderEntityCommand
 * @property {"reorderEntity"} type
 * @property {string} commandId
 * @property {"workspace" | "group" | "item"} entityType
 * @property {string} entityId
 * @property {string | null} [beforeId]
 * @property {string | null} [afterId]
 */

/**
 * @typedef {object} ImportExportCommand
 * @property {"importExport"} type
 * @property {string} commandId
 * @property {unknown} payload
 */

/**
 * @typedef {object} ExportSnapshotCommand
 * @property {"exportSnapshot"} type
 * @property {string} commandId
 */

/**
 * @typedef {CreateWorkspaceCommand | RenameWorkspaceCommand | ArchiveWorkspaceCommand | CreateGroupCommand | RenameGroupCommand | MoveItemCommand | TrashItemCommand | RestoreItemCommand | CreateItemCommand | ToggleTaskCommand | ReorderEntityCommand | ImportExportCommand | ExportSnapshotCommand} WorkspaceCommand
 */
