import { z } from "zod";
import {
  CONTRACT_LIMITS,
  ITEM_KINDS,
  WORKSPACE_EXPORT_SCHEMA_VERSION,
  WORKSPACE_SCHEMA_VERSION,
  migrateWorkspaceExport,
  normalizeHttpUrl,
  type CanonicalItem,
  type CommandLogEntry,
  type TrashBundle,
  type WorkspaceExportV2,
} from "@tabby/workspace-contracts";

export const itemSchema = z.object({
  id: z.string().min(1),
  groupId: z.string().min(1),
  kind: z.enum(ITEM_KINDS),
  title: z.string().max(CONTRACT_LIMITS.itemTitle),
  url: z.string().max(CONTRACT_LIMITS.url).optional(),
  content: z.string().max(CONTRACT_LIMITS.content).optional(),
  completed: z.boolean().optional(),
  createdAt: z.string().datetime(),
  order: z.number().finite().optional(),
});

export const groupSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z.string().min(1).max(CONTRACT_LIMITS.groupTitle),
  collapsed: z.boolean().default(false),
  order: z.number().finite().optional(),
});

export const workspaceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(CONTRACT_LIMITS.workspaceTitle),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  archived: z.boolean().default(false),
  order: z.number().finite().optional(),
});

export const tombstoneSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  entityType: z.enum(["workspace", "group", "item"]),
  deletedAt: z.string().datetime(),
});

export const trashBundleSchema = z.object({
  items: z.array(itemSchema),
  tombstones: z.array(tombstoneSchema),
});

export const commandLogEntrySchema = z.object({
  commandId: z.string().min(1),
  type: z.string().min(1),
  appliedAt: z.string().datetime(),
  result: z.unknown(),
});

/** Flat web persistence shape (IndexedDB). schemaVersion 1 or 2 are accepted on load. */
export const workspaceDataSchema = z.object({
  schemaVersion: z.union([
    z.literal(WORKSPACE_SCHEMA_VERSION),
    z.literal(WORKSPACE_EXPORT_SCHEMA_VERSION),
  ]),
  workspaces: z.array(workspaceSchema).max(CONTRACT_LIMITS.workspaces),
  groups: z.array(groupSchema).max(CONTRACT_LIMITS.groups),
  items: z.array(itemSchema).max(CONTRACT_LIMITS.items),
  trash: trashBundleSchema.optional(),
  commandLog: z.array(commandLogEntrySchema).optional(),
});

export type WorkspaceData = z.infer<typeof workspaceDataSchema>;
export type Workspace = WorkspaceData["workspaces"][number];
export type Group = WorkspaceData["groups"][number];
export type Item = WorkspaceData["items"][number];
export type WebTrashBundle = z.infer<typeof trashBundleSchema>;

export type WorkspaceSnapshotData = {
  state: WorkspaceExportV2;
  trash: TrashBundle;
  commandLog: CommandLogEntry[];
};

export const EMPTY_TRASH: TrashBundle = { items: [], tombstones: [] };

export const EMPTY_DATA: WorkspaceData = {
  schemaVersion: WORKSPACE_EXPORT_SCHEMA_VERSION,
  workspaces: [],
  groups: [],
  items: [],
  trash: { items: [], tombstones: [] },
  commandLog: [],
};

export function createId() {
  return crypto.randomUUID();
}

export function safeUrl(value: string): string | null {
  return normalizeHttpUrl(value);
}

export function searchItems(
  data: WorkspaceData | WorkspaceExportV2,
  query: string,
) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return data.items;
  const groupsById = new Map(data.groups.map((group) => [group.id, group]));
  const workspacesById = new Map(
    data.workspaces.map((workspace) => [workspace.id, workspace]),
  );
  return data.items.filter((item) => {
    const group = groupsById.get(item.groupId);
    const workspace = group ? workspacesById.get(group.workspaceId) : undefined;
    return [
      item.title,
      "url" in item ? item.url : undefined,
      "content" in item ? item.content : undefined,
      group?.title,
      workspace?.title,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(needle));
  });
}

function withOrders<T extends { id: string; order?: number }>(
  entities: T[],
): Array<T & { order: number }> {
  return entities.map((entity, index) => ({
    ...entity,
    order: Number.isFinite(entity.order) ? Number(entity.order) : index,
  }));
}

/** Normalize legacy IndexedDB payloads into a command-ready snapshot. */
export function toSnapshot(input: unknown): WorkspaceSnapshotData {
  if (isSnapshotShape(input)) {
    const state = migrateWorkspaceExport(input.state);
    return {
      state,
      trash: normalizeTrash(input.trash),
      commandLog: Array.isArray(input.commandLog)
        ? (input.commandLog as CommandLogEntry[])
        : [],
    };
  }

  const parsed = workspaceDataSchema.parse(input);
  const state = migrateWorkspaceExport({
    schemaVersion: parsed.schemaVersion,
    workspaces: withOrders(parsed.workspaces),
    groups: withOrders(parsed.groups),
    items: withOrders(parsed.items),
  });

  return {
    state,
    trash: normalizeTrash(parsed.trash),
    commandLog: (parsed.commandLog ?? []) as CommandLogEntry[],
  };
}

/** Persist snapshot as flat IndexedDB-compatible document (export schema v2 + trash). */
export function fromSnapshot(snapshot: WorkspaceSnapshotData): WorkspaceData {
  return {
    schemaVersion: WORKSPACE_EXPORT_SCHEMA_VERSION,
    workspaces: snapshot.state.workspaces,
    groups: snapshot.state.groups,
    items: snapshot.state.items,
    trash: {
      items: snapshot.trash.items,
      tombstones: snapshot.trash.tombstones,
    },
    commandLog: snapshot.commandLog,
  };
}

export function createStarterData(): WorkspaceData {
  const workspaceId = createId();
  const inboxId = createId();
  const readingId = createId();
  return fromSnapshot({
    state: {
      schemaVersion: WORKSPACE_EXPORT_SCHEMA_VERSION,
      workspaces: [
        {
          id: workspaceId,
          title: "My workspace",
          color: "#0f766e",
          archived: false,
          order: 0,
        },
      ],
      groups: [
        {
          id: inboxId,
          workspaceId,
          title: "Inbox",
          collapsed: false,
          order: 0,
        },
        {
          id: readingId,
          workspaceId,
          title: "Read later",
          collapsed: false,
          order: 1,
        },
      ],
      items: [
        {
          id: createId(),
          groupId: inboxId,
          kind: "note",
          title: "Welcome to Tabby",
          content:
            "Links, notes, and tasks stay on this device. Add your first item below.",
          createdAt: new Date().toISOString(),
          order: 0,
        },
        {
          id: createId(),
          groupId: inboxId,
          kind: "task",
          title: "Review the sample workspace",
          content: "",
          completed: false,
          createdAt: new Date().toISOString(),
          order: 1,
        },
      ],
    },
    trash: EMPTY_TRASH,
    commandLog: [],
  });
}

function isSnapshotShape(input: unknown): input is {
  state: unknown;
  trash?: unknown;
  commandLog?: unknown;
} {
  return Boolean(input && typeof input === "object" && "state" in input);
}

function normalizeTrash(value: unknown): TrashBundle {
  if (!value || typeof value !== "object") return { items: [], tombstones: [] };
  const record = value as { items?: unknown; tombstones?: unknown };
  const items = Array.isArray(record.items)
    ? (record.items as CanonicalItem[])
    : [];
  const tombstones = Array.isArray(record.tombstones)
    ? (record.tombstones as TrashBundle["tombstones"])
    : [];
  return { items, tombstones };
}

export function sortByOrder<T extends { id: string; order?: number }>(
  entities: T[],
): T[] {
  return [...entities].sort((left, right) => {
    const leftOrder = Number.isFinite(left.order) ? Number(left.order) : 0;
    const rightOrder = Number.isFinite(right.order) ? Number(right.order) : 0;
    return leftOrder === rightOrder
      ? left.id.localeCompare(right.id)
      : leftOrder - rightOrder;
  });
}
