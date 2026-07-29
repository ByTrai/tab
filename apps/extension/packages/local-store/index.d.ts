import type {
  CaptureItemV2,
  CaptureOperationV2,
  CaptureStateV2,
  CanonicalGroup,
  CanonicalItem,
  CanonicalWorkspace,
  CommandLogEntry,
  TrashBundle,
  WorkspaceExportV2,
} from "@tabby/workspace-contracts";

export const ENTITY_DB_NAME: "tabby-entities";
export const ENTITY_DB_VERSION: 1;
export const DEFAULT_TRASH_RETENTION_MS: number;
export const STORE_NAMES: Readonly<{
  workspaces: "workspaces";
  groups: "groups";
  items: "items";
  trash: "trash";
  operations: "operations";
  meta: "meta";
}>;

export type TrashEntityType = "workspace" | "group" | "item";

export interface TrashRecord {
  id: string;
  entityId: string;
  entityType: TrashEntityType;
  deletedAt: string;
  snapshot:
    | CanonicalWorkspace
    | CanonicalGroup
    | CanonicalItem
    | CaptureItemV2
    | Record<string, unknown>;
}

export interface EntityMeta {
  operationOrder: string[];
  migratedCapture?: boolean;
  migratedWeb?: boolean;
  lastExportSchemaVersion?: number;
  commandLog?: CommandLogEntry[];
  trashRetentionMs?: number;
  [key: string]: unknown;
}

export interface EntityState {
  workspaces: CanonicalWorkspace[];
  groups: CanonicalGroup[];
  items: Array<CanonicalItem | CaptureItemV2 | Record<string, unknown>>;
  trash: TrashRecord[];
  operations: CaptureOperationV2[];
  meta: EntityMeta;
}

export interface PurgeTrashResult {
  purged: number;
  deletedBefore: string;
}

export interface EntityRepositoryLike {
  loadExport(): Promise<WorkspaceExportV2>;
  replaceFromExport(exportInput: unknown): Promise<void>;
  getAll(): Promise<EntityState>;
  putWorkspace(workspace: CanonicalWorkspace): Promise<void>;
  putGroup(group: CanonicalGroup): Promise<void>;
  putItem(
    item: CanonicalItem | CaptureItemV2 | Record<string, unknown>,
  ): Promise<void>;
  trashItem(itemId: string, options?: { deletedAt?: string }): Promise<void>;
  restoreFromTrash(trashId: string): Promise<void>;
  listTrash(): Promise<TrashRecord[]>;
  commitCaptureOperation(
    operation: CaptureOperationV2,
    items: Array<CaptureItemV2 | CanonicalItem | Record<string, unknown>>,
  ): Promise<void>;
  updateOperation(operation: CaptureOperationV2): Promise<void>;
  getOperation(id: string): Promise<CaptureOperationV2 | undefined>;
  listOperations(): Promise<CaptureOperationV2[]>;
  savedLinkItems(): Promise<
    Array<CaptureItemV2 | CanonicalItem | Record<string, unknown>>
  >;
  migrateFromLegacyCaptureState(input: unknown): Promise<void>;
  migrateFromLegacyWebAggregate(input: unknown): Promise<void>;
  putTrashRecord(record: TrashRecord): Promise<void>;
  clearTrash(): Promise<void>;
  purgeExpiredTrash(options?: {
    deletedBefore?: string;
    now?: string;
  }): Promise<PurgeTrashResult>;
  getMeta(key: string): Promise<unknown>;
  setMeta(key: string, value: unknown): Promise<void>;
}

export function createEmptyEntityState(): EntityState;
export function wrapStorageError(error: unknown, action: string): Error;
export function applyExportToMemory(
  state: EntityState,
  exportInput: unknown,
): EntityState;
export function memoryRepository(
  initial?: Partial<EntityState>,
): EntityRepositoryLike;
export function trashRecordsToBundle(records: TrashRecord[]): TrashBundle;
export function trashBundleToRecords(
  trash: Pick<TrashBundle, "items" | "tombstones"> | TrashBundle,
): TrashRecord[];

export class EntityRepository implements EntityRepositoryLike {
  constructor(options?: { indexedDB?: IDBFactory });
  loadExport(): Promise<WorkspaceExportV2>;
  replaceFromExport(exportInput: unknown): Promise<void>;
  getAll(): Promise<EntityState>;
  putWorkspace(workspace: CanonicalWorkspace): Promise<void>;
  putGroup(group: CanonicalGroup): Promise<void>;
  putItem(
    item: CanonicalItem | CaptureItemV2 | Record<string, unknown>,
  ): Promise<void>;
  trashItem(itemId: string, options?: { deletedAt?: string }): Promise<void>;
  restoreFromTrash(trashId: string): Promise<void>;
  listTrash(): Promise<TrashRecord[]>;
  commitCaptureOperation(
    operation: CaptureOperationV2,
    items: Array<CaptureItemV2 | CanonicalItem | Record<string, unknown>>,
  ): Promise<void>;
  updateOperation(operation: CaptureOperationV2): Promise<void>;
  getOperation(id: string): Promise<CaptureOperationV2 | undefined>;
  listOperations(): Promise<CaptureOperationV2[]>;
  savedLinkItems(): Promise<
    Array<CaptureItemV2 | CanonicalItem | Record<string, unknown>>
  >;
  migrateFromLegacyCaptureState(input: CaptureStateV2 | unknown): Promise<void>;
  migrateFromLegacyWebAggregate(input: unknown): Promise<void>;
  putTrashRecord(record: TrashRecord): Promise<void>;
  clearTrash(): Promise<void>;
  purgeExpiredTrash(options?: {
    deletedBefore?: string;
    now?: string;
  }): Promise<PurgeTrashResult>;
  getMeta(key: string): Promise<unknown>;
  setMeta(key: string, value: unknown): Promise<void>;
}
