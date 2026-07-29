import {
  DEFAULT_TRASH_RETENTION_MS,
  EntityRepository,
  trashBundleToRecords,
  trashRecordsToBundle,
  type EntityRepositoryLike,
} from "@tabby/local-store";
import {
  applyCommand,
  serializeWorkspaceExport,
  type ApplyCommandResult,
  type CanonicalGroup,
  type CanonicalItem,
  type CanonicalWorkspace,
  type CommandLogEntry,
  type WorkspaceCommand,
} from "@tabby/workspace-contracts";
import {
  createId,
  createStarterData,
  EMPTY_TRASH,
  fromSnapshot,
  toSnapshot,
  type WorkspaceSnapshotData,
} from "./workspace";

const LEGACY_DB_NAME = "tabby-workspace";
const LEGACY_STORE_NAME = "state";
const LEGACY_STATE_KEY = "primary";
const META_COMMAND_LOG = "commandLog";
const META_BACKUP_OFFERED = "legacyBackupOffered";

export type LoadWorkspaceResult = WorkspaceSnapshotData & {
  migratedFromLegacy?: boolean;
  legacyBackupJson?: string;
};

function createRepository(indexedDB?: IDBFactory): EntityRepositoryLike {
  return new EntityRepository(indexedDB ? { indexedDB } : undefined);
}

async function readCommandLog(
  repository: EntityRepositoryLike,
): Promise<CommandLogEntry[]> {
  const value = await repository.getMeta(META_COMMAND_LOG);
  return Array.isArray(value) ? (value as CommandLogEntry[]) : [];
}

async function writeCommandLog(
  repository: EntityRepositoryLike,
  commandLog: CommandLogEntry[],
): Promise<void> {
  await repository.setMeta(META_COMMAND_LOG, commandLog);
}

async function snapshotFromRepository(
  repository: EntityRepositoryLike,
): Promise<WorkspaceSnapshotData> {
  const state = await repository.loadExport();
  const trash = trashRecordsToBundle(await repository.listTrash());
  const commandLog = await readCommandLog(repository);
  return { state, trash, commandLog };
}

async function readLegacyAggregate(indexedDB?: IDBFactory): Promise<unknown> {
  const factory = indexedDB ?? globalThis.indexedDB;
  if (!factory) return null;

  if (typeof factory.databases === "function") {
    try {
      const listed = await factory.databases();
      if (!listed.some((entry) => entry.name === LEGACY_DB_NAME)) {
        return null;
      }
    } catch {
      // Fall through to open() when databases() is unavailable or fails.
    }
  }

  const database = await new Promise<IDBDatabase | null>((resolve) => {
    const request = factory.open(LEGACY_DB_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  if (!database) return null;

  try {
    if (!database.objectStoreNames.contains(LEGACY_STORE_NAME)) {
      return null;
    }
    return await new Promise((resolve: (value: unknown) => void) => {
      try {
        const transaction = database.transaction(LEGACY_STORE_NAME, "readonly");
        const request = transaction
          .objectStore(LEGACY_STORE_NAME)
          .get(LEGACY_STATE_KEY);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } finally {
    database.close();
  }
}

async function seedStarter(repository: EntityRepositoryLike): Promise<void> {
  const starter = createStarterData();
  await repository.replaceFromExport({
    schemaVersion: starter.schemaVersion,
    workspaces: starter.workspaces,
    groups: starter.groups,
    items: starter.items,
  });
  await writeCommandLog(repository, []);
}

/**
 * Load the workspace from the indexed entity store (`tabby-entities`).
 * One-time migrates the legacy flat `tabby-workspace` aggregate when present.
 * Soft-trash older than 30 days is purged on load.
 */
export async function loadWorkspace(options?: {
  indexedDB?: IDBFactory;
  repository?: EntityRepositoryLike;
  now?: string;
}): Promise<LoadWorkspaceResult> {
  const repository =
    options?.repository ?? createRepository(options?.indexedDB);

  await repository.purgeExpiredTrash({
    now: options?.now,
  });

  const existing = await repository.getAll();
  const hasEntities =
    existing.workspaces.length > 0 ||
    existing.groups.length > 0 ||
    existing.items.length > 0 ||
    existing.trash.length > 0;

  if (!hasEntities && !existing.meta.migratedWeb) {
    const legacy = await readLegacyAggregate(options?.indexedDB);
    if (legacy) {
      const legacySnapshot = toSnapshot(legacy);
      const legacyBackupJson = serializeWorkspaceExport(legacySnapshot.state);
      await repository.migrateFromLegacyWebAggregate(
        fromSnapshot(legacySnapshot),
      );
      await writeCommandLog(repository, legacySnapshot.commandLog);
      await repository.setMeta(META_BACKUP_OFFERED, true);
      const migrated = await snapshotFromRepository(repository);
      return {
        ...migrated,
        migratedFromLegacy: true,
        legacyBackupJson,
      };
    }

    await seedStarter(repository);
    await repository.setMeta("migratedWeb", true);
  }

  return snapshotFromRepository(repository);
}

/**
 * Apply a domain command and persist entity deltas (mirrors the extension
 * CaptureService.applyWorkspaceCommand path). Prefer this over whole-document saves.
 */
export async function applyWorkspaceCommand(
  command: WorkspaceCommand,
  options?: {
    repository?: EntityRepositoryLike;
    indexedDB?: IDBFactory;
    createId?: () => string;
    now?: () => string;
  },
): Promise<ApplyCommandResult & { snapshot: WorkspaceSnapshotData }> {
  const repository =
    options?.repository ?? createRepository(options?.indexedDB);
  const createIdFn = options?.createId ?? createId;
  const current = await snapshotFromRepository(repository);

  if (command.type === "trashItem") {
    const applied = applyCommand(
      {
        state: current.state,
        trash: current.trash,
        commandLog: current.commandLog,
        createId: createIdFn,
        now: options?.now,
      },
      command,
    );
    const deletedAt =
      applied.result &&
      typeof applied.result === "object" &&
      "deletedAt" in applied.result &&
      typeof (applied.result as { deletedAt?: unknown }).deletedAt === "string"
        ? (applied.result as { deletedAt: string }).deletedAt
        : undefined;
    await repository.trashItem(command.itemId, { deletedAt });
    await writeCommandLog(repository, applied.commandLog);
    const snapshot = await snapshotFromRepository(repository);
    return { ...applied, trash: snapshot.trash, snapshot };
  }

  if (command.type === "restoreItem") {
    const trash = await repository.listTrash();
    const record = trash.find((entry) => entry.entityId === command.itemId);
    if (!record) throw new Error("Trashed item was not found.");
    const applied = applyCommand(
      {
        state: current.state,
        trash: current.trash,
        commandLog: current.commandLog,
        createId: createIdFn,
        now: options?.now,
      },
      command,
    );
    await repository.restoreFromTrash(record.id);
    if (
      applied.result &&
      typeof applied.result === "object" &&
      "item" in applied.result
    ) {
      const item = (applied.result as { item?: CanonicalItem }).item;
      if (item) await repository.putItem(item);
    }
    await writeCommandLog(repository, applied.commandLog);
    const snapshot = await snapshotFromRepository(repository);
    return { ...applied, trash: snapshot.trash, snapshot };
  }

  const applied = applyCommand(
    {
      state: current.state,
      trash: current.trash,
      commandLog: current.commandLog,
      createId: createIdFn,
      now: options?.now,
    },
    command,
  );

  if (
    command.type === "createWorkspace" ||
    command.type === "renameWorkspace" ||
    command.type === "archiveWorkspace"
  ) {
    const workspace = (applied.result as { workspace: CanonicalWorkspace })
      .workspace;
    await repository.putWorkspace(workspace);
  } else if (command.type === "createGroup" || command.type === "renameGroup") {
    const group = (applied.result as { group: CanonicalGroup }).group;
    await repository.putGroup(group);
  } else if (
    command.type === "createItem" ||
    command.type === "toggleTask" ||
    command.type === "moveItem"
  ) {
    const item = (applied.result as { item: CanonicalItem }).item;
    await repository.putItem(item);
  } else if (command.type === "importExport") {
    await repository.replaceFromExport(applied.state);
    await repository.clearTrash();
  } else {
    await repository.replaceFromExport(applied.state);
  }

  await writeCommandLog(repository, applied.commandLog);
  const snapshot = await snapshotFromRepository(repository);
  return {
    ...applied,
    trash: snapshot.trash,
    snapshot,
  };
}

/**
 * @deprecated Prefer applyWorkspaceCommand. Kept for emergency full-replace
 * recovery tooling; writes through the entity repository.
 */
export async function saveWorkspace(
  snapshot: WorkspaceSnapshotData,
  options?: { repository?: EntityRepositoryLike; indexedDB?: IDBFactory },
): Promise<void> {
  const repository =
    options?.repository ?? createRepository(options?.indexedDB);
  await repository.replaceFromExport(snapshot.state);
  await repository.clearTrash();
  for (const record of trashBundleToRecords(snapshot.trash)) {
    await repository.putTrashRecord(record);
  }
  await writeCommandLog(repository, snapshot.commandLog);
}

export { DEFAULT_TRASH_RETENTION_MS, EMPTY_TRASH };
