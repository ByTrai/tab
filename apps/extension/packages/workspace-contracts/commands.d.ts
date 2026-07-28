import type {
  CanonicalGroup,
  CanonicalItem,
  CanonicalWorkspace,
  ItemKind,
  OrderedEntity,
  Tombstone,
  WorkspaceExportV2,
} from "./index.js";

export const COMMAND_LOG_LIMIT: 200;

export type DomainErrorCategory =
  | "validation"
  | "quota"
  | "corruption"
  | "permission"
  | "partial_failure"
  | "unsupported"
  | "not_found"
  | "conflict";

export class DomainError extends Error {
  readonly name: "DomainError";
  readonly category: DomainErrorCategory;
  readonly code: string | undefined;
  constructor(
    category: DomainErrorCategory,
    message: string,
    options?: { code?: string; cause?: unknown },
  );
}

export interface CommandLogEntry {
  commandId: string;
  type: string;
  appliedAt: string;
  result: unknown;
}

export interface TrashBundle {
  items: CanonicalItem[];
  tombstones: Tombstone[];
}

export interface CommandContext {
  state: WorkspaceExportV2;
  trash?: TrashBundle;
  commandLog?: CommandLogEntry[];
  now?: () => string;
  createId?: () => string;
}

export interface ApplyCommandResult {
  state: WorkspaceExportV2;
  trash: TrashBundle;
  commandLog: CommandLogEntry[];
  result: unknown;
}

export interface CreateWorkspaceCommand {
  type: "createWorkspace";
  commandId: string;
  id?: string;
  title: string;
  color: string;
}

export interface RenameWorkspaceCommand {
  type: "renameWorkspace";
  commandId: string;
  workspaceId: string;
  title: string;
}

export interface ArchiveWorkspaceCommand {
  type: "archiveWorkspace";
  commandId: string;
  workspaceId: string;
  archived: boolean;
}

export interface CreateGroupCommand {
  type: "createGroup";
  commandId: string;
  id?: string;
  workspaceId: string;
  title: string;
  beforeId?: string | null;
  afterId?: string | null;
}

export interface RenameGroupCommand {
  type: "renameGroup";
  commandId: string;
  groupId: string;
  title: string;
}

export interface MoveItemCommand {
  type: "moveItem";
  commandId: string;
  itemId: string;
  groupId: string;
  beforeId?: string | null;
  afterId?: string | null;
}

export interface TrashItemCommand {
  type: "trashItem";
  commandId: string;
  itemId: string;
  tombstoneId?: string;
}

export interface RestoreItemCommand {
  type: "restoreItem";
  commandId: string;
  itemId: string;
  groupId?: string;
  beforeId?: string | null;
  afterId?: string | null;
}

export interface CreateItemCommand {
  type: "createItem";
  commandId: string;
  id?: string;
  groupId: string;
  kind: ItemKind;
  title?: string;
  url?: string;
  content?: string;
  completed?: boolean;
  createdAt?: string;
  beforeId?: string | null;
  afterId?: string | null;
}

export interface ToggleTaskCommand {
  type: "toggleTask";
  commandId: string;
  itemId: string;
  completed?: boolean;
}

export interface ReorderEntityCommand {
  type: "reorderEntity";
  commandId: string;
  entityType: "workspace" | "group" | "item";
  entityId: string;
  beforeId?: string | null;
  afterId?: string | null;
}

export interface ImportExportCommand {
  type: "importExport";
  commandId: string;
  payload: unknown;
}

export interface ExportSnapshotCommand {
  type: "exportSnapshot";
  commandId: string;
}

export type WorkspaceCommand =
  | CreateWorkspaceCommand
  | RenameWorkspaceCommand
  | ArchiveWorkspaceCommand
  | CreateGroupCommand
  | RenameGroupCommand
  | MoveItemCommand
  | TrashItemCommand
  | RestoreItemCommand
  | CreateItemCommand
  | ToggleTaskCommand
  | ReorderEntityCommand
  | ImportExportCommand
  | ExportSnapshotCommand;

export interface WorkspaceSnapshot {
  state: WorkspaceExportV2;
  trash: TrashBundle;
  commandLog: CommandLogEntry[];
}

/** Persistence boundary for T2.1 IndexedDB adapters. */
export interface WorkspaceRepository {
  load(): Promise<WorkspaceSnapshot>;
  save(snapshot: WorkspaceSnapshot): Promise<void>;
}

export function rebalanceOrders<T extends OrderedEntity>(entities: readonly T[]): T[];
export function applyCommand(
  context: CommandContext,
  command: WorkspaceCommand,
): ApplyCommandResult;

export class InMemoryWorkspaceRepository implements WorkspaceRepository {
  constructor(seed?: {
    state?: WorkspaceExportV2;
    trash?: TrashBundle;
    commandLog?: CommandLogEntry[];
  });
  load(): Promise<WorkspaceSnapshot>;
  save(snapshot: WorkspaceSnapshot): Promise<void>;
  execute(
    command: WorkspaceCommand,
    options?: { now?: () => string; createId?: () => string },
  ): Promise<ApplyCommandResult>;
}

export type {
  CanonicalGroup,
  CanonicalItem,
  CanonicalWorkspace,
  ItemKind,
  OrderedEntity,
  Tombstone,
  WorkspaceExportV2,
};
