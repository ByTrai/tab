/**
 * Dependency-free contracts shared by Tabby's browser clients.
 *
 * Keep this module free of framework, storage, and browser-extension APIs so it
 * can run unchanged in Next.js, a Manifest V3 worker, and Node-based tests.
 */

export const WORKSPACE_SCHEMA_VERSION = 1;
export const CAPTURE_STATE_SCHEMA_VERSION = 2;
export const ITEM_KINDS = /** @type {const} */ (["link", "note", "task"]);

export const CONTRACT_LIMITS = Object.freeze({
  workspaceTitle: 100,
  groupTitle: 100,
  itemTitle: 500,
  url: 4096,
  content: 20_000,
  workspaces: 500,
  groups: 5_000,
  items: 50_000,
  captureOperations: 1_000,
});

/**
 * Normalizes a URL only when it is safe to persist and later navigate to.
 * User-info is rejected because it can conceal the destination in UI and leak
 * credentials through exports, logs, or browser history.
 *
 * @param {unknown} value
 * @param {{ stripFragment?: boolean }} [options]
 * @returns {string | null}
 */
export function normalizeHttpUrl(value, { stripFragment = false } = {}) {
  if (typeof value !== "string" || value.length > CONTRACT_LIMITS.url)
    return null;

  try {
    const url = new URL(value.trim());
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    )
      return null;
    if (stripFragment) url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/** @param {unknown} value */
export function normalizedUrlKey(value) {
  return normalizeHttpUrl(value, { stripFragment: true });
}

/**
 * Upgrades the extension's v1 journal without changing keys or discarding
 * extension-only recovery metadata. The returned v2 link fields match the
 * shared workspace item vocabulary while legacy fields remain readable.
 *
 * @param {unknown} input
 * @returns {import("./index.js").CaptureStateV2}
 */
export function migrateCaptureState(input) {
  if (!isRecord(input)) throw new Error("Capture state must be an object.");
  if (
    input.schemaVersion !== 1 &&
    input.schemaVersion !== CAPTURE_STATE_SCHEMA_VERSION
  ) {
    throw new Error(
      `Unsupported capture state schema version: ${String(input.schemaVersion)}`,
    );
  }
  if (!Array.isArray(input.items) || !Array.isArray(input.operations)) {
    throw new Error("Capture state collections are invalid.");
  }
  if (
    input.items.length > CONTRACT_LIMITS.items ||
    input.operations.length > CONTRACT_LIMITS.captureOperations
  ) {
    throw new Error("Capture state exceeds supported collection limits.");
  }

  /**
   * @param {unknown} item
   * @returns {import("./index.js").CaptureItemV2}
   */
  const migrateItem = (item) => {
    if (!isRecord(item))
      throw new Error("Capture state contains an invalid item.");
    const createdAt =
      typeof item.createdAt === "string" ? item.createdAt : item.capturedAt;
    if (
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.url !== "string" ||
      !isUtcTimestamp(createdAt) ||
      typeof item.tabId !== "number" ||
      typeof item.pinned !== "boolean" ||
      typeof item.index !== "number"
    ) {
      throw new Error("Capture state contains an invalid item.");
    }
    return /** @type {import("./index.js").CaptureItemV2} */ ({
      ...item,
      kind: "link",
      createdAt,
    });
  };

  return {
    ...input,
    schemaVersion: CAPTURE_STATE_SCHEMA_VERSION,
    items: input.items.map(migrateItem),
    operations: input.operations.map((operation) => {
      if (!isRecord(operation))
        throw new Error("Capture state contains an invalid operation.");
      if (typeof operation.id !== "string")
        throw new Error("Capture state contains an invalid operation.");
      return /** @type {import("./index.js").CaptureOperationV2} */ ({
        ...operation,
        items: Array.isArray(operation.items)
          ? operation.items.map(migrateItem)
          : [],
      });
    }),
  };
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const WORKSPACE_EXPORT_SCHEMA_VERSION = 2;
export const ID_MAX_LENGTH = 128;

/** @param {unknown} value */
export function isUtcTimestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

/** @param {unknown} value */
export function isClientId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= ID_MAX_LENGTH && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);
}

/**
 * Returns a fractional position without rewriting neighboring entities. Callers
 * should rebalance a collection when floating-point precision is exhausted.
 * @param {number | null} before
 * @param {number | null} after
 */
export function orderBetween(before, after) {
  if (before !== null && !Number.isFinite(before)) throw new Error("The previous order is invalid.");
  if (after !== null && !Number.isFinite(after)) throw new Error("The next order is invalid.");
  if (before !== null && after !== null && before >= after) throw new Error("Order bounds must be ascending.");
  const value = before === null ? (after === null ? 0 : after - 1) : after === null ? before + 1 : before + (after - before) / 2;
  if (!Number.isFinite(value) || value === before || value === after) throw new Error("Order precision is exhausted; rebalance the collection.");
  return value;
}

/**
 * Migrates the local web aggregate into the canonical portable export. It
 * rejects the entire payload before producing data, so import adapters can
 * offer a dry run without partially persisting attacker-controlled input.
 * @param {unknown} input
 * @returns {import("./index.js").WorkspaceExportV2}
 */
export function migrateWorkspaceExport(input) {
  if (!isRecord(input)) throw new Error("Workspace export must be an object.");
  if (input.schemaVersion !== 1 && input.schemaVersion !== WORKSPACE_EXPORT_SCHEMA_VERSION) {
    throw new Error(`Unsupported workspace schema version: ${String(input.schemaVersion)}`);
  }
  const workspaces = boundedArray(input.workspaces, CONTRACT_LIMITS.workspaces, "workspaces");
  const groups = boundedArray(input.groups, CONTRACT_LIMITS.groups, "groups");
  const items = boundedArray(input.items, CONTRACT_LIMITS.items, "items");
  const workspaceIds = new Set();
  const groupIds = new Set();
  const allIds = new Set();

  const canonicalWorkspaces = workspaces.map((entry, index) => {
    const value = entity(entry, "workspace", allIds);
    workspaceIds.add(value.id);
    return {
      id: value.id,
      title: text(value.title, 1, CONTRACT_LIMITS.workspaceTitle, "workspace title"),
      color: color(value.color),
      archived: boolean(value.archived, "workspace archived"),
      order: order(value.order, index),
    };
  });
  const canonicalGroups = groups.map((entry, index) => {
    const value = entity(entry, "group", allIds);
    if (!isClientId(value.workspaceId) || !workspaceIds.has(value.workspaceId)) throw new Error("Group references an unknown workspace.");
    groupIds.add(value.id);
    return {
      id: value.id,
      workspaceId: value.workspaceId,
      title: text(value.title, 1, CONTRACT_LIMITS.groupTitle, "group title"),
      collapsed: boolean(value.collapsed, "group collapsed"),
      order: order(value.order, index),
    };
  });
  const canonicalItems = items.map((entry, index) => {
    const value = entity(entry, "item", allIds);
    if (!isClientId(value.groupId) || !groupIds.has(value.groupId)) throw new Error("Item references an unknown group.");
    if (!ITEM_KINDS.includes(value.kind)) throw new Error("Item kind is invalid.");
    const title = text(value.title, 0, CONTRACT_LIMITS.itemTitle, "item title");
    const createdAt = timestamp(value.createdAt, "item createdAt");
    const base = { id: value.id, groupId: value.groupId, kind: value.kind, title, createdAt, order: order(value.order, index) };
    if (value.kind === "link") {
      const url = normalizeHttpUrl(value.url);
      if (!url) throw new Error("Link URL is invalid.");
      return { ...base, kind: "link", url };
    }
    const content = text(value.content ?? "", 0, CONTRACT_LIMITS.content, "item content");
    return value.kind === "task"
      ? { ...base, kind: "task", content, completed: boolean(value.completed ?? false, "task completed") }
      : { ...base, kind: "note", content };
  });
  return { schemaVersion: WORKSPACE_EXPORT_SCHEMA_VERSION, workspaces: canonicalWorkspaces, groups: canonicalGroups, items: canonicalItems };
}

/** @param {import("./index.js").WorkspaceExportV2} value */
export function serializeWorkspaceExport(value) {
  const canonical = migrateWorkspaceExport(value);
  return `${JSON.stringify(canonical, null, 2)}\n`;
}

function boundedArray(value, maximum, name) {
  if (!Array.isArray(value)) throw new Error(`Workspace ${name} must be an array.`);
  if (value.length > maximum) throw new Error(`Workspace ${name} exceed the supported limit.`);
  return value;
}
function entity(value, name, allIds) {
  if (!isRecord(value) || !isClientId(value.id)) throw new Error(`Workspace ${name} has an invalid ID.`);
  if (allIds.has(value.id)) throw new Error(`Duplicate entity ID: ${value.id}`);
  allIds.add(value.id);
  return value;
}
function text(value, minimum, maximum, name) {
  if (typeof value !== "string" || value.length < minimum || value.length > maximum) throw new Error(`${name} is invalid.`);
  return value;
}
function boolean(value, name) {
  if (typeof value !== "boolean") throw new Error(`${name} is invalid.`);
  return value;
}
function color(value) {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error("Workspace color is invalid.");
  return value.toLowerCase();
}
function order(value, fallback) {
  const result = value === undefined ? fallback : value;
  if (!Number.isFinite(result)) throw new Error("Entity order is invalid.");
  return result;
}
function timestamp(value, name) {
  if (!isUtcTimestamp(value)) throw new Error(`${name} must be a canonical UTC timestamp.`);
  return value;
}

export {
  COMMAND_LOG_LIMIT,
  DomainError,
  InMemoryWorkspaceRepository,
  applyCommand,
  rebalanceOrders,
} from "./commands.js";
