"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createId,
  EMPTY_DATA,
  safeUrl,
  searchItems,
  workspaceDataSchema,
  type Item,
  type WorkspaceData,
} from "~/lib/workspace";
import { loadWorkspace, saveWorkspace } from "~/lib/workspace-store";

type ItemKind = Item["kind"];

export function WorkspaceApp() {
  const [data, setData] = useState<WorkspaceData>(EMPTY_DATA);
  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ItemKind>("link");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Loading your local workspace…");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadWorkspace()
      .then((loaded) => {
        setData(loaded);
        setActiveId(loaded.workspaces.find((workspace) => !workspace.archived)?.id ?? "");
        setStatus("Saved locally");
      })
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Storage unavailable"));
  }, []);

  const commit = async (next: WorkspaceData, message = "Saved locally") => {
    setStatus("Saving…");
    try {
      await saveWorkspace(next);
      setData(next);
      setStatus(message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed — no changes were applied");
    }
  };

  const active = data.workspaces.find(({ id }) => id === activeId);
  const groups = data.groups.filter(({ workspaceId }) => workspaceId === activeId);
  const matches = useMemo(() => new Set(searchItems(data, query).map(({ id }) => id)), [data, query]);
  const visibleItems = data.items.filter((item) => groups.some(({ id }) => id === item.groupId) && matches.has(item.id));

  const addWorkspace = () => {
    const title = window.prompt("Workspace name", "New workspace")?.trim();
    if (!title) return;
    const id = createId();
    const groupId = createId();
    void commit({ ...data, workspaces: [...data.workspaces, { id, title, color: "#dc694a", archived: false }], groups: [...data.groups, { id: groupId, workspaceId: id, title: "Inbox", collapsed: false }] });
    setActiveId(id);
  };

  const addGroup = () => {
    const title = window.prompt("Group name", "New group")?.trim();
    if (!title || !activeId) return;
    void commit({ ...data, groups: [...data.groups, { id: createId(), workspaceId: activeId, title, collapsed: false }] });
  };

  const addItem = () => {
    const value = draft.trim();
    const target = groups[0];
    if (!value || !target) return;
    const url = kind === "link" ? safeUrl(value) : undefined;
    if (kind === "link" && !url) { setStatus("Use a valid http:// or https:// address"); return; }
    const item: Item = {
      id: createId(), groupId: target.id, kind,
      title: kind === "link" ? new URL(url!).hostname.replace(/^www\./, "") : value,
      ...(url ? { url } : {}),
      ...(kind === "note" ? { content: value } : {}),
      ...(kind === "task" ? { completed: false } : {}),
      createdAt: new Date().toISOString(),
    };
    void commit({ ...data, items: [item, ...data.items] }, `${kind[0]!.toUpperCase()}${kind.slice(1)} added`);
    setDraft("");
  };

  const removeItem = (id: string) => void commit({ ...data, items: data.items.filter((item) => item.id !== id) }, "Item removed");
  const toggleTask = (id: string) => void commit({ ...data, items: data.items.map((item) => item.id === id ? { ...item, completed: !item.completed } : item) });

  const downloadExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tabby-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus("Backup exported");
  };

  const importExport = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 10_000_000) throw new Error("Import is larger than the 10 MB limit");
      const parsed: unknown = JSON.parse(await file.text());
      const imported = workspaceDataSchema.parse(parsed);
      if (!window.confirm(`Replace local data with ${imported.items.length} items in ${imported.workspaces.length} workspaces?`)) return;
      await commit(imported, "Backup imported");
      setActiveId(imported.workspaces[0]?.id ?? "");
    } catch (error) { setStatus(error instanceof Error ? `Import failed: ${error.message}` : "Import failed"); }
    finally { if (importRef.current) importRef.current.value = ""; }
  };

  return (
    <main className={theme === "dark" ? "app-shell dark" : "app-shell"}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">t</span><strong>tabby</strong></div>
        <nav aria-label="Workspaces">
          <p className="eyebrow">Workspaces</p>
          {data.workspaces.filter(({ archived }) => !archived).map((workspace) => (
            <button className={workspace.id === activeId ? "workspace active" : "workspace"} key={workspace.id} onClick={() => setActiveId(workspace.id)}>
              <span className="workspace-dot" style={{ background: workspace.color }} />{workspace.title}
              <small>{data.items.filter((item) => data.groups.some((group) => group.workspaceId === workspace.id && group.id === item.groupId)).length}</small>
            </button>
          ))}
          <button className="add-workspace" onClick={addWorkspace}>＋ Add workspace</button>
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>◐ <span>{theme === "light" ? "Dark" : "Light"} theme</span></button>
          <button onClick={() => setMenuOpen(!menuOpen)}>⚙ <span>Data & settings</span></button>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <label className="search"><span>⌕</span><input aria-label="Search workspace" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search links, notes, and tasks…" /><kbd>⌘ K</kbd></label>
          <span className="local-pill">● Local only</span>
          <button className="avatar" aria-label="Open profile">Y</button>
        </header>

        {menuOpen && <div className="settings-popover"><strong>Your data stays yours</strong><p>Everything is stored in this browser with IndexedDB. Export a backup before clearing browser data.</p><div><button onClick={downloadExport}>Export JSON</button><button onClick={() => importRef.current?.click()}>Import JSON</button></div></div>}
        <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importExport(event.target.files?.[0])} />

        <div className="page-heading">
          <div><p className="eyebrow">Personal space</p><h1>{active?.title ?? "Your workspaces"}</h1><p>Keep what matters close. Everything here is available offline.</p></div>
          <button className="secondary" onClick={addGroup}>＋ New group</button>
        </div>

        {!active ? <EmptyState onCreate={addWorkspace} /> : <>
          <section className="quick-add" aria-label="Quick add">
            <div className="kind-tabs">{(["link", "note", "task"] as const).map((value) => <button key={value} className={kind === value ? "selected" : ""} onClick={() => setKind(value)}>{value === "link" ? "↗" : value === "note" ? "▤" : "✓"} {value[0]!.toUpperCase() + value.slice(1)}</button>)}</div>
            <div className="add-row"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addItem(); }} placeholder={kind === "link" ? "Paste a link to save…" : kind === "note" ? "Write a quick note…" : "What needs doing?"} /><button onClick={addItem}>Add</button></div>
          </section>

          <div className="summary-row"><span><strong>{visibleItems.length}</strong> {visibleItems.length === 1 ? "item" : "items"}{query && ` matching “${query}”`}</span><span className="save-state">● {status}</span></div>
          <div className="group-grid">
            {groups.map((group) => <section className="group" key={group.id}>
              <header><div><span className="drag">⠿</span><h2>{group.title}</h2><small>{visibleItems.filter(({ groupId }) => groupId === group.id).length}</small></div><button aria-label={`Group menu for ${group.title}`}>•••</button></header>
              <div className="cards">
                {visibleItems.filter(({ groupId }) => groupId === group.id).map((item) => <ItemCard key={item.id} item={item} onRemove={removeItem} onToggle={toggleTask} />)}
                {!visibleItems.some(({ groupId }) => groupId === group.id) && <div className="group-empty">{query ? "No matches in this group" : "Drop ideas here or use quick add"}</div>}
              </div>
            </section>)}
          </div>
        </>}
      </section>
    </main>
  );
}

function ItemCard({ item, onRemove, onToggle }: { item: Item; onRemove: (id: string) => void; onToggle: (id: string) => void }) {
  const domain = item.url ? new URL(item.url).hostname.replace(/^www\./, "") : "";
  return <article className={`item-card ${item.completed ? "done" : ""}`}>
    <div className={`item-icon ${item.kind}`}>{item.kind === "link" ? domain[0]?.toUpperCase() : item.kind === "note" ? "▤" : <button aria-label={item.completed ? "Reopen task" : "Complete task"} onClick={() => onToggle(item.id)}>{item.completed ? "✓" : ""}</button>}</div>
    <div className="item-copy">
      {item.kind === "link" ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : <strong>{item.title}</strong>}
      <small>{item.kind === "link" ? domain : item.kind === "note" ? "Note" : item.completed ? "Completed" : "Task"}</small>
    </div>
    <button className="remove" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.title}`}>×</button>
  </article>;
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return <div className="empty-state"><div>✦</div><h2>Create your first workspace</h2><p>Group links, thoughts, and tasks without creating an account.</p><button onClick={onCreate}>Create workspace</button></div>;
}
