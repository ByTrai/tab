/**
 * Indexed entity repository for Tabby's local-first clients.
 *
 * Pure memory helpers run in Node tests without IndexedDB. The IndexedDB
 * EntityRepository mirrors the same API for the Chromium extension and web
 * migration path. Depends only on @tabby/workspace-contracts.
 */

import {
  CONTRACT_LIMITS,
  WORKSPACE_EXPORT_SCHEMA_VERSION,
  migrateCaptureState,
  migrateWorkspaceExport,
} from "../workspace-contracts/index.js";

export const ENTITY_DB_NAME = "tabby-entities";
export const ENTITY_DB_VERSION = 1;

export const STORE_NAMES = Object.freeze({
  workspaces: "workspaces",
  groups: "groups",
  items: "items",
  trash: "trash",
  operations: "operations",
  meta: "meta",
});

const META_KEYS = Object.freeze({
  operationOrder: "operationOrder",
  migratedCapture: "migratedCapture",
  migratedWeb: "migratedWeb",
});

const RECOVERY_HINT =
  "Export a backup if you can still open Tabby, then clear site data and re-import to recover.";

/** @returns {import("./index.js").EntityState} */
export function createEmptyEntityState() {
  return {
    workspaces: [],
    groups: [],
    items: [],
    trash: [],
    operations: [],
    meta: {
      operationOrder: [],
    },
  };
}

/**
 * @param {unknown} error
 * @param {string} action
 */
export function wrapStorageError(error, action) {
  const name =
    error && typeof error === "object" && "name" in error
      ? String(error.name)
      : "";
  const message =
    error instanceof Error
      ? error.message
      : String(error ?? "unknown storage error");
  if (name === "QuotaExceededError" || /quota/i.test(message)) {
    return new Error(
      `Tabby's local storage is out of quota while trying to ${action}. ${RECOVERY_HINT}`,
    );
  }
  if (
    name === "InvalidStateError" ||
    name === "UnknownError" ||
    /corrupt|Internal error|DataError/i.test(message)
  ) {
    return new Error(
      `Tabby's local entity database looks corrupted while trying to ${action}. ${RECOVERY_HINT}`,
    );
  }
  return new Error(
    `Could not ${action} in Tabby's local entity store: ${message}. ${RECOVERY_HINT}`,
  );
}

/**
 * Applies a validated workspace export into an in-memory entity state.
 * Replaces workspaces, groups, and items; clears trash; preserves operations.
 *
 * @param {import("./index.js").EntityState} state
 * @param {unknown} exportInput
 * @returns {import("./index.js").EntityState}
 */
export function applyExportToMemory(state, exportInput) {
  const canonical = migrateWorkspaceExport(exportInput);
  return {
    ...cloneState(state),
    workspaces: canonical.workspaces.map(clone),
    groups: canonical.groups.map(clone),
    items: canonical.items.map(clone),
    trash: [],
    meta: {
      ...clone(state.meta ?? {}),
      operationOrder: [...(state.meta?.operationOrder ?? [])],
      lastExportSchemaVersion: canonical.schemaVersion,
    },
  };
}

/**
 * In-memory repository used by Node tests and as the behavioral reference for
 * IndexedDB EntityRepository.
 *
 * @param {Partial<import("./index.js").EntityState>} [initial]
 * @returns {import("./index.js").EntityRepositoryLike}
 */
export function memoryRepository(initial = {}) {
  let state = {
    ...createEmptyEntityState(),
    ...structuredClone(initial),
    meta: {
      ...createEmptyEntityState().meta,
      ...(initial.meta ? structuredClone(initial.meta) : {}),
      operationOrder: [...(initial.meta?.operationOrder ?? [])],
    },
  };
  if (!Array.isArray(state.workspaces)) state.workspaces = [];
  if (!Array.isArray(state.groups)) state.groups = [];
  if (!Array.isArray(state.items)) state.items = [];
  if (!Array.isArray(state.trash)) state.trash = [];
  if (!Array.isArray(state.operations)) state.operations = [];
  if (!Array.isArray(state.meta.operationOrder)) state.meta.operationOrder = [];

  return {
    async loadExport() {
      return toExport(state);
    },
    async replaceFromExport(exportInput) {
      state = applyExportToMemory(state, exportInput);
    },
    async getAll() {
      return cloneState(state);
    },
    async putWorkspace(workspace) {
      state.workspaces = upsertById(state.workspaces, workspace);
    },
    async putGroup(group) {
      state.groups = upsertById(state.groups, group);
    },
    async putItem(item) {
      state.items = upsertById(state.items, item);
    },
    async trashItem(itemId, { deletedAt } = {}) {
      state = trashItemInState(state, itemId, deletedAt);
    },
    async restoreFromTrash(trashId) {
      state = restoreFromTrashInState(state, trashId);
    },
    async listTrash() {
      return sortTrash(state.trash).map(clone);
    },
    async commitCaptureOperation(operation, items) {
      state = commitCaptureInState(state, operation, items);
    },
    async updateOperation(operation) {
      const index = state.operations.findIndex(
        (entry) => entry.id === operation.id,
      );
      if (index === -1)
        throw new Error(`Capture operation not found: ${operation.id}`);
      state.operations = state.operations.map((entry) =>
        entry.id === operation.id ? clone(operation) : entry,
      );
    },
    async getOperation(id) {
      const operation = state.operations.find((entry) => entry.id === id);
      return operation ? clone(operation) : undefined;
    },
    async listOperations() {
      return orderedOperations(state).map(clone);
    },
    async savedLinkItems() {
      return state.items.filter((item) => item.kind === "link").map(clone);
    },
    async migrateFromLegacyCaptureState(input) {
      state = migrateCaptureIntoState(state, input);
    },
    async migrateFromLegacyWebAggregate(input) {
      state = migrateWebIntoState(state, input);
    },
  };
}

/**
 * IndexedDB-backed entity repository (DB `tabby-entities` v1).
 */
export class EntityRepository {
  /** @param {{ indexedDB?: IDBFactory }} [options] */
  constructor(options = {}) {
    this._indexedDB = options.indexedDB;
  }

  /** @returns {IDBFactory} */
  _factory() {
    const factory = this._indexedDB ?? globalThis.indexedDB;
    if (!factory) {
      throw new Error(
        `IndexedDB is unavailable for Tabby's entity store. ${RECOVERY_HINT}`,
      );
    }
    return factory;
  }

  async loadExport() {
    return this._read((stores) => toExportFromMaps(stores));
  }

  async replaceFromExport(exportInput) {
    const canonical = migrateWorkspaceExport(exportInput);
    await this._write(
      [
        STORE_NAMES.workspaces,
        STORE_NAMES.groups,
        STORE_NAMES.items,
        STORE_NAMES.trash,
        STORE_NAMES.meta,
      ],
      async (stores) => {
        await clearStore(stores.workspaces);
        await clearStore(stores.groups);
        await clearStore(stores.items);
        await clearStore(stores.trash);
        for (const workspace of canonical.workspaces)
          await putRecord(stores.workspaces, workspace);
        for (const group of canonical.groups)
          await putRecord(stores.groups, group);
        for (const item of canonical.items) await putRecord(stores.items, item);
        await putMeta(
          stores.meta,
          "lastExportSchemaVersion",
          canonical.schemaVersion,
        );
      },
    );
  }

  async getAll() {
    return this._read(async (stores) => {
      const operationOrder =
        (await getMeta(stores.meta, META_KEYS.operationOrder)) ?? [];
      return {
        workspaces: await getAllRecords(stores.workspaces),
        groups: await getAllRecords(stores.groups),
        items: await getAllRecords(stores.items),
        trash: await getAllRecords(stores.trash),
        operations: await getAllRecords(stores.operations),
        meta: {
          operationOrder: Array.isArray(operationOrder) ? operationOrder : [],
          ...(await readMetaObject(stores.meta)),
        },
      };
    });
  }

  async putWorkspace(workspace) {
    await this._write([STORE_NAMES.workspaces], async (stores) => {
      await putRecord(stores.workspaces, workspace);
    });
  }

  async putGroup(group) {
    await this._write([STORE_NAMES.groups], async (stores) => {
      await putRecord(stores.groups, group);
    });
  }

  async putItem(item) {
    await this._write([STORE_NAMES.items], async (stores) => {
      await putRecord(stores.items, item);
    });
  }

  async trashItem(itemId, { deletedAt } = {}) {
    await this._write(
      [STORE_NAMES.items, STORE_NAMES.trash],
      async (stores) => {
        const item = await getRecord(stores.items, itemId);
        if (!item) throw new Error(`Item not found: ${itemId}`);
        const record = createTrashRecord(item, deletedAt);
        await putRecord(stores.trash, record);
        await deleteRecord(stores.items, itemId);
      },
    );
  }

  async restoreFromTrash(trashId) {
    await this._write(
      [
        STORE_NAMES.items,
        STORE_NAMES.groups,
        STORE_NAMES.workspaces,
        STORE_NAMES.trash,
      ],
      async (stores) => {
        const record = await getRecord(stores.trash, trashId);
        if (!record) throw new Error(`Trash record not found: ${trashId}`);
        const store = storeForEntityType(stores, record.entityType);
        await putRecord(store, record.snapshot);
        await deleteRecord(stores.trash, trashId);
      },
    );
  }

  async listTrash() {
    return this._read(async (stores) =>
      sortTrash(await getAllRecords(stores.trash)),
    );
  }

  async commitCaptureOperation(operation, items) {
    if (!operation || typeof operation.id !== "string") {
      throw new Error("Capture operation must include a string id.");
    }
    await this._write(
      [STORE_NAMES.items, STORE_NAMES.operations, STORE_NAMES.meta],
      async (stores) => {
        const existing = await getRecord(stores.operations, operation.id);
        if (existing) return;

        for (const item of items ?? []) await putRecord(stores.items, item);
        await putRecord(stores.operations, operation);

        let order =
          (await getMeta(stores.meta, META_KEYS.operationOrder)) ?? [];
        if (!Array.isArray(order)) order = [];
        order = [...order, operation.id];
        while (order.length > CONTRACT_LIMITS.captureOperations) {
          const oldest = order.shift();
          if (oldest) await deleteRecord(stores.operations, oldest);
        }
        await putMeta(stores.meta, META_KEYS.operationOrder, order);
      },
    );
  }

  async updateOperation(operation) {
    await this._write([STORE_NAMES.operations], async (stores) => {
      const existing = await getRecord(stores.operations, operation.id);
      if (!existing)
        throw new Error(`Capture operation not found: ${operation.id}`);
      await putRecord(stores.operations, operation);
    });
  }

  async getOperation(id) {
    return this._read(async (stores) => getRecord(stores.operations, id));
  }

  async listOperations() {
    return this._read(async (stores) => {
      const order =
        (await getMeta(stores.meta, META_KEYS.operationOrder)) ?? [];
      const all = await getAllRecords(stores.operations);
      return orderOperations(all, Array.isArray(order) ? order : []);
    });
  }

  async savedLinkItems() {
    return this._read(async (stores) => {
      const items = await getAllRecords(stores.items);
      return items.filter((item) => item.kind === "link");
    });
  }

  async migrateFromLegacyCaptureState(input) {
    const migrated = migrateCaptureState(input);
    await this._write(
      [STORE_NAMES.items, STORE_NAMES.operations, STORE_NAMES.meta],
      async (stores) => {
        for (const item of migrated.items) await putRecord(stores.items, item);
        let order =
          (await getMeta(stores.meta, META_KEYS.operationOrder)) ?? [];
        if (!Array.isArray(order)) order = [];
        for (const operation of migrated.operations) {
          const existing = await getRecord(stores.operations, operation.id);
          if (existing) continue;
          await putRecord(stores.operations, operation);
          order.push(operation.id);
        }
        while (order.length > CONTRACT_LIMITS.captureOperations) {
          const oldest = order.shift();
          if (oldest) await deleteRecord(stores.operations, oldest);
        }
        await putMeta(stores.meta, META_KEYS.operationOrder, order);
        await putMeta(stores.meta, META_KEYS.migratedCapture, true);
      },
    );
  }

  async migrateFromLegacyWebAggregate(input) {
    const canonical = migrateWorkspaceExport(input);
    await this._write(
      [
        STORE_NAMES.workspaces,
        STORE_NAMES.groups,
        STORE_NAMES.items,
        STORE_NAMES.meta,
      ],
      async (stores) => {
        for (const workspace of canonical.workspaces)
          await putRecord(stores.workspaces, workspace);
        for (const group of canonical.groups)
          await putRecord(stores.groups, group);
        for (const item of canonical.items) await putRecord(stores.items, item);
        await putMeta(stores.meta, META_KEYS.migratedWeb, true);
        await putMeta(
          stores.meta,
          "lastExportSchemaVersion",
          canonical.schemaVersion,
        );
      },
    );
  }

  /**
   * @template T
   * @param {(stores: Record<string, IDBObjectStore>) => Promise<T> | T} fn
   * @returns {Promise<T>}
   */
  async _read(fn) {
    return this._withTransaction(
      Object.values(STORE_NAMES),
      "readonly",
      fn,
      "read entity data",
    );
  }

  /**
   * @param {string[]} storeNames
   * @param {(stores: Record<string, IDBObjectStore>) => Promise<void> | void} fn
   */
  async _write(storeNames, fn) {
    await this._withTransaction(
      storeNames,
      "readwrite",
      fn,
      "persist entity data",
    );
  }

  /**
   * Atomic IndexedDB transaction helper.
   *
   * @template T
   * @param {string[]} storeNames
   * @param {IDBTransactionMode} mode
   * @param {(stores: Record<string, IDBObjectStore>) => Promise<T> | T} fn
   * @param {string} action
   * @returns {Promise<T>}
   */
  async _withTransaction(storeNames, mode, fn, action) {
    const database = await this._open();
    try {
      return await new Promise((resolve, reject) => {
        let settled = false;
        /** @type {T | undefined} */
        let result;
        const transaction = database.transaction(storeNames, mode);
        /** @type {Record<string, IDBObjectStore>} */
        const stores = {};
        for (const name of storeNames)
          stores[name] = transaction.objectStore(name);

        Promise.resolve()
          .then(() => fn(stores))
          .then((value) => {
            result = value;
          })
          .catch((error) => {
            settled = true;
            try {
              transaction.abort();
            } catch {
              /* already finished */
            }
            reject(wrapStorageError(error, action));
          });

        transaction.oncomplete = () => {
          if (!settled) {
            settled = true;
            resolve(/** @type {T} */ (result));
          }
        };
        transaction.onerror = () => {
          if (!settled) {
            settled = true;
            reject(wrapStorageError(transaction.error, action));
          }
        };
        transaction.onabort = () => {
          if (!settled) {
            settled = true;
            reject(wrapStorageError(transaction.error, action));
          }
        };
      });
    } finally {
      database.close();
    }
  }

  /** @returns {Promise<IDBDatabase>} */
  _open() {
    const factory = this._factory();
    return new Promise((resolve, reject) => {
      const request = factory.open(ENTITY_DB_NAME, ENTITY_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAMES.workspaces)) {
          db.createObjectStore(STORE_NAMES.workspaces, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.groups)) {
          const groups = db.createObjectStore(STORE_NAMES.groups, {
            keyPath: "id",
          });
          groups.createIndex("byWorkspaceId", "workspaceId", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.items)) {
          const items = db.createObjectStore(STORE_NAMES.items, {
            keyPath: "id",
          });
          items.createIndex("byGroupId", "groupId", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.trash)) {
          const trash = db.createObjectStore(STORE_NAMES.trash, {
            keyPath: "id",
          });
          trash.createIndex("byDeletedAt", "deletedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.operations)) {
          db.createObjectStore(STORE_NAMES.operations, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.meta)) {
          db.createObjectStore(STORE_NAMES.meta);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(wrapStorageError(request.error, "open the entity database"));
    });
  }
}

// --- shared pure helpers ----------------------------------------------------

/** @param {unknown} value */
function clone(value) {
  return structuredClone(value);
}

/** @param {import("./index.js").EntityState} state */
function cloneState(state) {
  return {
    workspaces: state.workspaces.map(clone),
    groups: state.groups.map(clone),
    items: state.items.map(clone),
    trash: state.trash.map(clone),
    operations: state.operations.map(clone),
    meta: clone(state.meta ?? { operationOrder: [] }),
  };
}

/**
 * @template {{ id: string }} T
 * @param {T[]} list
 * @param {T} record
 */
function upsertById(list, record) {
  const next = clone(record);
  const index = list.findIndex((entry) => entry.id === next.id);
  if (index === -1) return [...list, next];
  const copy = list.slice();
  copy[index] = next;
  return copy;
}

/** @param {import("./index.js").EntityState} state */
function toExport(state) {
  return {
    schemaVersion: WORKSPACE_EXPORT_SCHEMA_VERSION,
    workspaces: sortByOrder(state.workspaces).map(clone),
    groups: sortByOrder(state.groups).map(clone),
    items: sortByOrder(state.items.filter(isCanonicalItem)).map(clone),
  };
}

/**
 * @param {{
 *   workspaces: IDBObjectStore,
 *   groups: IDBObjectStore,
 *   items: IDBObjectStore,
 * }} stores
 */
async function toExportFromMaps(stores) {
  const workspaces = sortByOrder(await getAllRecords(stores.workspaces));
  const groups = sortByOrder(await getAllRecords(stores.groups));
  const items = sortByOrder(
    (await getAllRecords(stores.items)).filter(isCanonicalItem),
  );
  return {
    schemaVersion: WORKSPACE_EXPORT_SCHEMA_VERSION,
    workspaces,
    groups,
    items,
  };
}

/** @param {unknown} item */
function isCanonicalItem(item) {
  return (
    isRecord(item) &&
    typeof item.groupId === "string" &&
    typeof item.kind === "string" &&
    typeof item.title === "string" &&
    typeof item.createdAt === "string"
  );
}

/** @param {unknown} value */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @template {{ order?: number }} T
 * @param {T[]} list
 */
function sortByOrder(list) {
  return list.slice().sort((left, right) => {
    const leftOrder = Number.isFinite(left.order)
      ? /** @type {number} */ (left.order)
      : 0;
    const rightOrder = Number.isFinite(right.order)
      ? /** @type {number} */ (right.order)
      : 0;
    return leftOrder - rightOrder;
  });
}

/** @param {import("./index.js").TrashRecord[]} trash */
function sortTrash(trash) {
  return trash.slice().sort((left, right) => {
    if (left.deletedAt === right.deletedAt)
      return left.id.localeCompare(right.id);
    return left.deletedAt < right.deletedAt ? -1 : 1;
  });
}

/**
 * @param {import("./index.js").EntityState} state
 * @param {string} itemId
 * @param {string} [deletedAt]
 */
function trashItemInState(state, itemId, deletedAt) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) throw new Error(`Item not found: ${itemId}`);
  const record = createTrashRecord(item, deletedAt);
  return {
    ...cloneState(state),
    items: state.items.filter((entry) => entry.id !== itemId).map(clone),
    trash: [...state.trash.map(clone), record],
  };
}

/**
 * @param {import("./index.js").EntityState} state
 * @param {string} trashId
 */
function restoreFromTrashInState(state, trashId) {
  const record = state.trash.find((entry) => entry.id === trashId);
  if (!record) throw new Error(`Trash record not found: ${trashId}`);
  const next = cloneState(state);
  next.trash = next.trash.filter((entry) => entry.id !== trashId);
  if (record.entityType === "item")
    next.items = upsertById(next.items, record.snapshot);
  else if (record.entityType === "group")
    next.groups = upsertById(next.groups, record.snapshot);
  else if (record.entityType === "workspace")
    next.workspaces = upsertById(next.workspaces, record.snapshot);
  else
    throw new Error(
      `Unsupported trash entity type: ${String(record.entityType)}`,
    );
  return next;
}

/**
 * @param {object} item
 * @param {string} [deletedAt]
 * @returns {import("./index.js").TrashRecord}
 */
function createTrashRecord(item, deletedAt) {
  const when = deletedAt ?? new Date().toISOString();
  if (typeof when !== "string")
    throw new Error("Trash deletedAt must be a string timestamp.");
  return {
    id: `trash:${item.id}:${when}`,
    entityId: item.id,
    entityType: "item",
    deletedAt: when,
    snapshot: clone(item),
  };
}

/**
 * @param {import("./index.js").EntityState} state
 * @param {{ id: string, [key: string]: unknown }} operation
 * @param {object[]} items
 */
function commitCaptureInState(state, operation, items) {
  if (!operation || typeof operation.id !== "string") {
    throw new Error("Capture operation must include a string id.");
  }
  if (state.operations.some((entry) => entry.id === operation.id)) {
    return cloneState(state);
  }
  const next = cloneState(state);
  for (const item of items ?? []) next.items = upsertById(next.items, item);
  next.operations = [...next.operations, clone(operation)];
  next.meta.operationOrder = [
    ...(next.meta.operationOrder ?? []),
    operation.id,
  ];
  while (next.meta.operationOrder.length > CONTRACT_LIMITS.captureOperations) {
    const oldest = next.meta.operationOrder.shift();
    if (oldest) {
      next.operations = next.operations.filter((entry) => entry.id !== oldest);
    }
  }
  return next;
}

/** @param {import("./index.js").EntityState} state */
function orderedOperations(state) {
  return orderOperations(state.operations, state.meta?.operationOrder ?? []);
}

/**
 * @param {object[]} operations
 * @param {string[]} order
 */
function orderOperations(operations, order) {
  const byId = new Map(operations.map((entry) => [entry.id, entry]));
  const ordered = [];
  for (const id of order) {
    const entry = byId.get(id);
    if (entry) {
      ordered.push(entry);
      byId.delete(id);
    }
  }
  for (const entry of byId.values()) ordered.push(entry);
  return ordered;
}

/**
 * @param {import("./index.js").EntityState} state
 * @param {unknown} input
 */
function migrateCaptureIntoState(state, input) {
  const migrated = migrateCaptureState(input);
  let next = cloneState(state);
  for (const item of migrated.items) next.items = upsertById(next.items, item);
  for (const operation of migrated.operations) {
    if (next.operations.some((entry) => entry.id === operation.id)) continue;
    next.operations = [...next.operations, clone(operation)];
    next.meta.operationOrder = [
      ...(next.meta.operationOrder ?? []),
      operation.id,
    ];
  }
  while (next.meta.operationOrder.length > CONTRACT_LIMITS.captureOperations) {
    const oldest = next.meta.operationOrder.shift();
    if (oldest)
      next.operations = next.operations.filter((entry) => entry.id !== oldest);
  }
  next.meta.migratedCapture = true;
  return next;
}

/**
 * @param {import("./index.js").EntityState} state
 * @param {unknown} input
 */
function migrateWebIntoState(state, input) {
  const canonical = migrateWorkspaceExport(input);
  const next = cloneState(state);
  for (const workspace of canonical.workspaces)
    next.workspaces = upsertById(next.workspaces, workspace);
  for (const group of canonical.groups)
    next.groups = upsertById(next.groups, group);
  for (const item of canonical.items) next.items = upsertById(next.items, item);
  next.meta.migratedWeb = true;
  next.meta.lastExportSchemaVersion = canonical.schemaVersion;
  return next;
}

/**
 * @param {Record<string, IDBObjectStore>} stores
 * @param {string} entityType
 */
function storeForEntityType(stores, entityType) {
  if (entityType === "item") return stores.items;
  if (entityType === "group") return stores.groups;
  if (entityType === "workspace") return stores.workspaces;
  throw new Error(`Unsupported trash entity type: ${String(entityType)}`);
}

/** @param {IDBObjectStore} store */
function getAllRecords(store) {
  return requestToPromise(store.getAll());
}

/**
 * @param {IDBObjectStore} store
 * @param {IDBValidKey} key
 */
function getRecord(store, key) {
  return requestToPromise(store.get(key));
}

/**
 * @param {IDBObjectStore} store
 * @param {object} value
 */
function putRecord(store, value) {
  return requestToPromise(store.put(clone(value)));
}

/**
 * @param {IDBObjectStore} store
 * @param {IDBValidKey} key
 */
function deleteRecord(store, key) {
  return requestToPromise(store.delete(key));
}

/** @param {IDBObjectStore} store */
function clearStore(store) {
  return requestToPromise(store.clear());
}

/**
 * @param {IDBObjectStore} store
 * @param {string} key
 */
function getMeta(store, key) {
  return requestToPromise(store.get(key));
}

/**
 * @param {IDBObjectStore} store
 * @param {string} key
 * @param {unknown} value
 */
function putMeta(store, key, value) {
  return requestToPromise(store.put(clone(value), key));
}

/** @param {IDBObjectStore} store */
async function readMetaObject(store) {
  const keys = await requestToPromise(store.getAllKeys());
  /** @type {Record<string, unknown>} */
  const meta = {};
  for (const key of keys) {
    if (typeof key !== "string") continue;
    if (key === META_KEYS.operationOrder) continue;
    meta[key] = await getMeta(store, key);
  }
  return meta;
}

/**
 * @template T
 * @param {IDBRequest<T>} request
 * @returns {Promise<T>}
 */
function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });
}
