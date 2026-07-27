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
      typeof createdAt !== "string" ||
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
