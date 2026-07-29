"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DomainError,
  previewWorkspaceImport,
  serializeWorkspaceExport,
  type CanonicalItem,
  type WorkspaceCommand,
} from "@tabby/workspace-contracts";
import {
  createId,
  EMPTY_TRASH,
  safeUrl,
  searchItems,
  sortByOrder,
  type WorkspaceSnapshotData,
} from "~/lib/workspace";
import { applyWorkspaceCommand, loadWorkspace } from "~/lib/workspace-store";

type ItemKind = CanonicalItem["kind"];
type ThemeMode = "light" | "dark";

const THEME_KEY = "tabby-theme";
const DESTINATION_KEY = "tabby-destination-group";
const WORKSPACE_COLORS = [
  "#0f766e",
  "#b45309",
  "#1d4e89",
  "#9f1239",
  "#365314",
];

const EMPTY_SNAPSHOT: WorkspaceSnapshotData = {
  state: { schemaVersion: 2, workspaces: [], groups: [], items: [] },
  trash: EMPTY_TRASH,
  commandLog: [],
};

export function WorkspaceApp() {
  const [snapshot, setSnapshot] =
    useState<WorkspaceSnapshotData>(EMPTY_SNAPSHOT);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ItemKind>("link");
  const [draft, setDraft] = useState("");
  const [destinationGroupId, setDestinationGroupId] = useState("");
  const [status, setStatus] = useState("Loading your local workspace…");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<null | "workspace" | "group" | "import">(
    null,
  );
  const [dialogValue, setDialogValue] = useState("");
  const [pendingImport, setPendingImport] = useState<{
    payload: unknown;
    summary: string;
  } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const dialogInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
    const savedDestination = window.localStorage.getItem(DESTINATION_KEY);
    if (savedDestination) setDestinationGroupId(savedDestination);

    void loadWorkspace()
      .then((loaded) => {
        const next: WorkspaceSnapshotData = {
          state: loaded.state,
          trash: loaded.trash,
          commandLog: loaded.commandLog,
        };
        snapshotRef.current = next;
        setSnapshot(next);
        setActiveId(
          sortByOrder(loaded.state.workspaces).find(
            (workspace) => !workspace.archived,
          )?.id ?? "",
        );
        if (loaded.migratedFromLegacy && loaded.legacyBackupJson) {
          const blob = new Blob([loaded.legacyBackupJson], {
            type: "application/json",
          });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `tabby-pre-migration-backup-${new Date().toISOString().slice(0, 10)}.json`;
          link.click();
          URL.revokeObjectURL(link.href);
          setStatus(
            "Migrated to the indexed local store — a pre-migration backup was downloaded",
          );
        } else {
          setStatus("Saved locally");
        }
      })
      .catch((error: unknown) =>
        setStatus(
          error instanceof Error ? error.message : "Storage unavailable",
        ),
      );
  }, []);

  useEffect(() => {
    if (dialog === "workspace" || dialog === "group") {
      dialogInputRef.current?.focus();
      dialogInputRef.current?.select();
    }
  }, [dialog]);

  const runCommand = async (
    command: WorkspaceCommand,
    message?: string,
  ): Promise<WorkspaceSnapshotData | null> => {
    try {
      setStatus("Saving…");
      const applied = await applyWorkspaceCommand(command, { createId });
      snapshotRef.current = applied.snapshot;
      setSnapshot(applied.snapshot);
      setStatus(message ?? "Saved locally");
      return applied.snapshot;
    } catch (error) {
      setStatus(
        error instanceof DomainError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Command failed",
      );
      return null;
    }
  };

  const data = snapshot.state;
  const active = data.workspaces.find(({ id }) => id === activeId);
  const groups = sortByOrder(
    data.groups.filter(({ workspaceId }) => workspaceId === activeId),
  );
  const matches = useMemo(
    () => new Set(searchItems(data, query).map(({ id }) => id)),
    [data, query],
  );
  const visibleItems = sortByOrder(
    data.items.filter(
      (item) =>
        groups.some(({ id }) => id === item.groupId) && matches.has(item.id),
    ),
  );
  const trashItems = sortByOrder(snapshot.trash.items);

  useEffect(() => {
    if (!groups.length) return;
    if (!groups.some((group) => group.id === destinationGroupId)) {
      setDestinationGroupId(groups[0]!.id);
    }
  }, [groups, destinationGroupId]);

  const setThemePersist = (next: ThemeMode) => {
    setTheme(next);
    window.localStorage.setItem(THEME_KEY, next);
  };

  const setDestinationPersist = (groupId: string) => {
    setDestinationGroupId(groupId);
    window.localStorage.setItem(DESTINATION_KEY, groupId);
  };

  const openNameDialog = (type: "workspace" | "group") => {
    setDialogValue(type === "workspace" ? "New workspace" : "New group");
    setDialog(type);
  };

  const submitNameDialog = async () => {
    const title = dialogValue.trim();
    if (!title || (dialog !== "workspace" && dialog !== "group")) return;

    if (dialog === "workspace") {
      const id = createId();
      const groupId = createId();
      const color =
        WORKSPACE_COLORS[data.workspaces.length % WORKSPACE_COLORS.length]!;
      const created = await runCommand({
        type: "createWorkspace",
        commandId: createId(),
        id,
        title,
        color,
      });
      if (!created) return;
      const withInbox = await runCommand(
        {
          type: "createGroup",
          commandId: createId(),
          id: groupId,
          workspaceId: id,
          title: "Inbox",
        },
        "Workspace created",
      );
      if (!withInbox) return;
      setActiveId(id);
      setDestinationPersist(groupId);
      setDialog(null);
      return;
    }

    if (!activeId) return;
    const ok = await runCommand(
      {
        type: "createGroup",
        commandId: createId(),
        workspaceId: activeId,
        title,
      },
      "Group created",
    );
    if (ok) setDialog(null);
  };

  const addItem = async () => {
    const value = draft.trim();
    const targetId = destinationGroupId || groups[0]?.id;
    if (!value || !targetId) return;

    if (kind === "link") {
      const url = safeUrl(value);
      if (!url) {
        setStatus("Use a valid http:// or https:// address");
        return;
      }
      const ok = await runCommand(
        {
          type: "createItem",
          commandId: createId(),
          groupId: targetId,
          kind: "link",
          title: new URL(url).hostname.replace(/^www\./, ""),
          url,
        },
        "Link added",
      );
      if (ok) setDraft("");
      return;
    }

    const ok = await runCommand(
      {
        type: "createItem",
        commandId: createId(),
        groupId: targetId,
        kind,
        title: value,
        content: kind === "note" ? value : "",
        completed: kind === "task" ? false : undefined,
      },
      `${kind[0]!.toUpperCase()}${kind.slice(1)} added`,
    );
    if (ok) setDraft("");
  };

  const trashItem = (id: string) =>
    void runCommand(
      { type: "trashItem", commandId: createId(), itemId: id },
      "Moved to trash",
    );

  const restoreItem = (id: string) =>
    void runCommand(
      { type: "restoreItem", commandId: createId(), itemId: id },
      "Restored from trash",
    );

  const toggleTask = (id: string) =>
    void runCommand({ type: "toggleTask", commandId: createId(), itemId: id });

  const downloadExport = () => {
    const serialized = serializeWorkspaceExport(data);
    const blob = new Blob([serialized], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tabby-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus("Backup exported");
  };

  const beginImport = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 10_000_000)
        throw new Error("Import is larger than the 10 MB limit");
      const payload: unknown = JSON.parse(await file.text());
      const preview = previewWorkspaceImport(
        payload,
        snapshotRef.current.state,
      );
      setPendingImport({ payload, summary: preview.summary });
      setDialog("import");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Import failed: ${error.message}`
          : "Import failed",
      );
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    const ok = await runCommand(
      {
        type: "importExport",
        commandId: createId(),
        payload: pendingImport.payload,
      },
      "Backup imported",
    );
    if (!ok) {
      setDialog(null);
      setPendingImport(null);
      return;
    }
    const next = snapshotRef.current;
    setActiveId(next.state.workspaces[0]?.id ?? "");
    setDialog(null);
    setPendingImport(null);
  };

  const workspaceList = sortByOrder(
    data.workspaces.filter(({ archived }) => !archived),
  );

  return (
    <main className={theme === "dark" ? "app-shell dark" : "app-shell"}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            t
          </span>
          <strong>Tabby</strong>
        </div>
        <nav aria-label="Workspaces">
          <p className="eyebrow">Workspaces</p>
          <div className="workspace-list">
            {workspaceList.map((workspace) => (
              <button
                className={
                  workspace.id === activeId ? "workspace active" : "workspace"
                }
                key={workspace.id}
                type="button"
                onClick={() => setActiveId(workspace.id)}
              >
                <span
                  className="workspace-dot"
                  style={{ background: workspace.color }}
                />
                <span className="workspace-title">{workspace.title}</span>
                <small>
                  {
                    data.items.filter((item) =>
                      data.groups.some(
                        (group) =>
                          group.workspaceId === workspace.id &&
                          group.id === item.groupId,
                      ),
                    ).length
                  }
                </small>
              </button>
            ))}
          </div>
          <label className="mobile-workspace">
            <span className="sr-only">Switch workspace</span>
            <select
              value={activeId}
              onChange={(event) => setActiveId(event.target.value)}
              aria-label="Switch workspace"
            >
              {workspaceList.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.title}
                </option>
              ))}
            </select>
          </label>
          <button
            className="add-workspace"
            type="button"
            onClick={() => openNameDialog("workspace")}
          >
            ＋ Add workspace
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button
            type="button"
            onClick={() =>
              setThemePersist(theme === "light" ? "dark" : "light")
            }
          >
            ◐ <span>{theme === "light" ? "Dark" : "Light"} theme</span>
          </button>
          <button type="button" onClick={() => setMenuOpen(!menuOpen)}>
            ⚙ <span>Data & settings</span>
          </button>
          <Link className="sidebar-home" href="/">
            ← Marketing home
          </Link>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <label className="search">
            <span aria-hidden>⌕</span>
            <input
              aria-label="Search workspace"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search links, notes, and tasks…"
            />
          </label>
          <span className="local-pill">● Local only</span>
        </header>

        {menuOpen && (
          <div
            className="settings-popover"
            role="dialog"
            aria-label="Data and settings"
          >
            <strong>Your data stays yours</strong>
            <p>
              Everything is stored in this browser with IndexedDB. Export a
              backup before clearing browser data. Deleted items go to trash
              until you restore them.
            </p>
            <div className="settings-actions">
              <button type="button" onClick={downloadExport}>
                Export JSON
              </button>
              <button type="button" onClick={() => importRef.current?.click()}>
                Import JSON
              </button>
            </div>
            <div className="trash-panel">
              <p className="eyebrow">Trash</p>
              {trashItems.length === 0 ? (
                <p className="trash-empty">Trash is empty.</p>
              ) : (
                <ul>
                  {trashItems.map((item) => (
                    <li key={item.id}>
                      <span>{item.title || item.kind}</span>
                      <button
                        type="button"
                        onClick={() => restoreItem(item.id)}
                      >
                        Restore
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        <input
          ref={importRef}
          hidden
          type="file"
          accept="application/json,.json"
          onChange={(event) => void beginImport(event.target.files?.[0])}
        />

        <div className="page-heading">
          <div>
            <p className="eyebrow">Personal space</p>
            <h1>{active?.title ?? "Your workspaces"}</h1>
            <p>
              Keep what matters close. Everything here is available offline.
            </p>
          </div>
          <button
            className="secondary"
            type="button"
            onClick={() => openNameDialog("group")}
            disabled={!activeId}
          >
            ＋ New group
          </button>
        </div>

        {!active ? (
          <EmptyState onCreate={() => openNameDialog("workspace")} />
        ) : (
          <>
            <section className="quick-add" aria-label="Quick add">
              <div className="kind-tabs">
                {(["link", "note", "task"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={kind === value ? "selected" : ""}
                    onClick={() => setKind(value)}
                  >
                    {value === "link" ? "↗" : value === "note" ? "▤" : "✓"}{" "}
                    {value[0]!.toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
              <div className="add-row">
                <label className="destination">
                  <span className="sr-only">Destination group</span>
                  <select
                    value={destinationGroupId}
                    onChange={(event) =>
                      setDestinationPersist(event.target.value)
                    }
                    aria-label="Destination group"
                  >
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.title}
                      </option>
                    ))}
                  </select>
                </label>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void addItem();
                  }}
                  placeholder={
                    kind === "link"
                      ? "Paste a link to save…"
                      : kind === "note"
                        ? "Write a quick note…"
                        : "What needs doing?"
                  }
                />
                <button type="button" onClick={() => void addItem()}>
                  Add
                </button>
              </div>
            </section>

            <div className="summary-row">
              <span>
                <strong>{visibleItems.length}</strong>{" "}
                {visibleItems.length === 1 ? "item" : "items"}
                {query && ` matching “${query}”`}
              </span>
              <span className="save-state">● {status}</span>
            </div>
            <div className="group-grid">
              {groups.map((group) => (
                <section className="group" key={group.id}>
                  <header>
                    <div>
                      <h2>{group.title}</h2>
                      <small>
                        {
                          visibleItems.filter(
                            ({ groupId }) => groupId === group.id,
                          ).length
                        }
                      </small>
                    </div>
                  </header>
                  <div className="cards">
                    {visibleItems
                      .filter(({ groupId }) => groupId === group.id)
                      .map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onTrash={trashItem}
                          onToggle={toggleTask}
                        />
                      ))}
                    {!visibleItems.some(
                      ({ groupId }) => groupId === group.id,
                    ) && (
                      <div className="group-empty">
                        {query
                          ? "No matches in this group"
                          : "Use quick add to place something here"}
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </section>

      {dialog && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            {dialog === "import" ? (
              <>
                <h2 id="dialog-title">Import backup</h2>
                <p>{pendingImport?.summary}</p>
                <div className="dialog-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setDialog(null);
                      setPendingImport(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="button" onClick={() => void confirmImport()}>
                    Replace data
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="dialog-title">
                  {dialog === "workspace"
                    ? "Name this workspace"
                    : "Name this group"}
                </h2>
                <label>
                  <span className="sr-only">Name</span>
                  <input
                    ref={dialogInputRef}
                    value={dialogValue}
                    onChange={(event) => setDialogValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void submitNameDialog();
                      if (event.key === "Escape") setDialog(null);
                    }}
                    maxLength={100}
                  />
                </label>
                <div className="dialog-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setDialog(null)}
                  >
                    Cancel
                  </button>
                  <button type="button" onClick={() => void submitNameDialog()}>
                    Create
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function ItemCard({
  item,
  onTrash,
  onToggle,
}: {
  item: CanonicalItem;
  onTrash: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const domain =
    item.kind === "link"
      ? new URL(item.url).hostname.replace(/^www\./, "")
      : "";
  const done = item.kind === "task" && item.completed;
  return (
    <article className={`item-card ${done ? "done" : ""}`}>
      <div className={`item-icon ${item.kind}`}>
        {item.kind === "link" ? (
          domain[0]?.toUpperCase()
        ) : item.kind === "note" ? (
          "▤"
        ) : (
          <button
            type="button"
            aria-label={done ? "Reopen task" : "Complete task"}
            onClick={() => onToggle(item.id)}
          >
            {done ? "✓" : ""}
          </button>
        )}
      </div>
      <div className="item-copy">
        {item.kind === "link" ? (
          <a href={item.url} target="_blank" rel="noreferrer">
            {item.title}
          </a>
        ) : (
          <strong>{item.title}</strong>
        )}
        <small>
          {item.kind === "link"
            ? domain
            : item.kind === "note"
              ? "Note"
              : done
                ? "Completed"
                : "Task"}
        </small>
      </div>
      <button
        className="remove"
        type="button"
        onClick={() => onTrash(item.id)}
        aria-label={`Move ${item.title} to trash`}
      >
        ×
      </button>
    </article>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="empty-state">
      <div aria-hidden>✦</div>
      <h2>Create your first workspace</h2>
      <p>Group links, thoughts, and tasks without creating an account.</p>
      <button type="button" onClick={onCreate}>
        Create workspace
      </button>
    </div>
  );
}
