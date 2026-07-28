export const WORKSPACE_SCHEMA_VERSION: 1;
export const CAPTURE_STATE_SCHEMA_VERSION: 2;
export const ITEM_KINDS: readonly ["link", "note", "task"];
export const CONTRACT_LIMITS: Readonly<{
  workspaceTitle: 100;
  groupTitle: 100;
  itemTitle: 500;
  url: 4096;
  content: 20000;
  workspaces: 500;
  groups: 5000;
  items: 50000;
  captureOperations: 1000;
}>;

export interface WorkspaceEntity {
  id: string;
  title: string;
  color: string;
  archived: boolean;
}

export interface GroupEntity {
  id: string;
  workspaceId: string;
  title: string;
  collapsed: boolean;
}

export interface WorkspaceItemEntity {
  id: string;
  groupId: string;
  kind: (typeof ITEM_KINDS)[number];
  title: string;
  url?: string;
  content?: string;
  completed?: boolean;
  createdAt: string;
}

export interface CaptureItemV2 {
  id: string;
  kind: "link";
  title: string;
  url: string;
  createdAt: string;
  capturedAt?: string;
  tabId: number;
  pinned: boolean;
  index: number;
  [key: string]: unknown;
}

export interface CaptureOperationV2 {
  id: string;
  items: CaptureItemV2[];
  [key: string]: unknown;
}

export interface CaptureStateV2 {
  schemaVersion: 2;
  items: CaptureItemV2[];
  operations: CaptureOperationV2[];
  [key: string]: unknown;
}

export function normalizeHttpUrl(
  value: unknown,
  options?: { stripFragment?: boolean },
): string | null;
export function normalizedUrlKey(value: unknown): string | null;
export function migrateCaptureState(input: unknown): CaptureStateV2;

export const WORKSPACE_EXPORT_SCHEMA_VERSION: 2;
export const ID_MAX_LENGTH: 128;
export type ItemKind = (typeof ITEM_KINDS)[number];

export interface OrderedEntity { id: string; order: number }
export interface CanonicalWorkspace extends OrderedEntity { title: string; color: string; archived: boolean }
export interface CanonicalGroup extends OrderedEntity { workspaceId: string; title: string; collapsed: boolean }
export interface CanonicalItemBase extends OrderedEntity { groupId: string; title: string; createdAt: string }
export interface CanonicalLink extends CanonicalItemBase { kind: "link"; url: string }
export interface CanonicalNote extends CanonicalItemBase { kind: "note"; content: string }
export interface CanonicalTask extends CanonicalItemBase { kind: "task"; content: string; completed: boolean }
export type CanonicalItem = CanonicalLink | CanonicalNote | CanonicalTask;
export interface WorkspaceExportV2 {
  schemaVersion: 2;
  workspaces: CanonicalWorkspace[];
  groups: CanonicalGroup[];
  items: CanonicalItem[];
}
export interface RecoveryRecord { id: string; operationId: string; createdAt: string; reason: string }
export interface Tombstone { id: string; entityId: string; entityType: "workspace" | "group" | "item"; deletedAt: string }

export function isUtcTimestamp(value: unknown): value is string;
export function isClientId(value: unknown): value is string;
export function orderBetween(before: number | null, after: number | null): number;
export function migrateWorkspaceExport(input: unknown): WorkspaceExportV2;
export function serializeWorkspaceExport(value: WorkspaceExportV2): string;

export {
  COMMAND_LOG_LIMIT,
  DomainError,
  InMemoryWorkspaceRepository,
  applyCommand,
  rebalanceOrders,
} from "./commands.js";
export type {
  ApplyCommandResult,
  ArchiveWorkspaceCommand,
  CommandContext,
  CommandLogEntry,
  CreateGroupCommand,
  CreateItemCommand,
  CreateWorkspaceCommand,
  DomainErrorCategory,
  ExportSnapshotCommand,
  ImportExportCommand,
  MoveItemCommand,
  RenameGroupCommand,
  RenameWorkspaceCommand,
  ReorderEntityCommand,
  RestoreItemCommand,
  ToggleTaskCommand,
  TrashBundle,
  TrashItemCommand,
  WorkspaceCommand,
  WorkspaceRepository,
  WorkspaceSnapshot,
} from "./commands.js";
