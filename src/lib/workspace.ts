import { z } from "zod";
import {
  CONTRACT_LIMITS,
  ITEM_KINDS,
  WORKSPACE_SCHEMA_VERSION,
  normalizeHttpUrl,
} from "../../apps/extension/packages/workspace-contracts/index.js";

export const itemSchema = z.object({
  id: z.string().min(1),
  groupId: z.string().min(1),
  kind: z.enum(ITEM_KINDS),
  title: z.string().max(CONTRACT_LIMITS.itemTitle),
  url: z.string().max(CONTRACT_LIMITS.url).optional(),
  content: z.string().max(CONTRACT_LIMITS.content).optional(),
  completed: z.boolean().optional(),
  createdAt: z.string().datetime(),
});

export const groupSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z.string().min(1).max(CONTRACT_LIMITS.groupTitle),
  collapsed: z.boolean().default(false),
});

export const workspaceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(CONTRACT_LIMITS.workspaceTitle),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  archived: z.boolean().default(false),
});

export const workspaceDataSchema = z.object({
  schemaVersion: z.literal(WORKSPACE_SCHEMA_VERSION),
  workspaces: z.array(workspaceSchema).max(CONTRACT_LIMITS.workspaces),
  groups: z.array(groupSchema).max(CONTRACT_LIMITS.groups),
  items: z.array(itemSchema).max(CONTRACT_LIMITS.items),
});

export type WorkspaceData = z.infer<typeof workspaceDataSchema>;
export type Workspace = WorkspaceData["workspaces"][number];
export type Group = WorkspaceData["groups"][number];
export type Item = WorkspaceData["items"][number];

export const EMPTY_DATA: WorkspaceData = {
  schemaVersion: WORKSPACE_SCHEMA_VERSION,
  workspaces: [],
  groups: [],
  items: [],
};

export function createId() {
  return crypto.randomUUID();
}

export function safeUrl(value: string): string | null {
  return normalizeHttpUrl(value);
}

export function searchItems(data: WorkspaceData, query: string) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return data.items;
  return data.items.filter((item) => {
    const group = data.groups.find(({ id }) => id === item.groupId);
    const workspace = data.workspaces.find(
      ({ id }) => id === group?.workspaceId,
    );
    return [item.title, item.url, item.content, group?.title, workspace?.title]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase().includes(needle));
  });
}

export function createStarterData(): WorkspaceData {
  const workspaceId = createId();
  const inboxId = createId();
  const readingId = createId();
  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    workspaces: [
      {
        id: workspaceId,
        title: "My workspace",
        color: "#7157d9",
        archived: false,
      },
    ],
    groups: [
      { id: inboxId, workspaceId, title: "Inbox", collapsed: false },
      { id: readingId, workspaceId, title: "Read later", collapsed: false },
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
      },
      {
        id: createId(),
        groupId: inboxId,
        kind: "task",
        title: "Review the sample workspace",
        completed: false,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}
