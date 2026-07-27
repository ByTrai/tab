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
