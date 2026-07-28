import { normalizeHttpUrl } from "./packages/workspace-contracts/index.js";

const tabsRoot = document.querySelector("#tabs");
const savedRoot = document.querySelector("#saved");
const workspacesRoot = document.querySelector("#workspaces");
const status = document.querySelector("#status");
const count = document.querySelector("#count");
const selectAll = document.querySelector("#select-all");
const saveButton = document.querySelector("#save");
const closeButton = document.querySelector("#save-close");
const toast = document.querySelector("#toast");
const toastCopy = document.querySelector("#toast-copy");
const undoButton = document.querySelector("#undo");
const searchInput = document.querySelector("#search");
const restoreSelectedButton = document.querySelector("#restore-selected");
const trashSelectedButton = document.querySelector("#trash-selected");
const newWorkspaceButton = document.querySelector("#new-workspace");
const newGroupButton = document.querySelector("#new-group");

let inventory = [];
let lastCommandId = null;
/** @type {{ workspaces: any[]; groups: any[]; items: any[] }} */
let workspace = { workspaces: [], groups: [], items: [] };
let searchQuery = "";

async function request(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || "The extension did not respond.");
  return response.value;
}

function selectedTabIds() {
  return [...tabsRoot.querySelectorAll("input:checked")].map((input) => Number(input.value));
}

function selectedSavedIds() {
  return [...workspacesRoot.querySelectorAll("input.saved-item:checked")].map(
    (input) => input.value,
  );
}

function syncCaptureButtons() {
  const selected = selectedTabIds().length;
  saveButton.disabled = selected === 0;
  closeButton.disabled = selected === 0;
  status.textContent = selected ? `${selected} selected` : "Select tabs to continue";
}

function syncOrganizeButtons() {
  const selected = selectedSavedIds().length;
  restoreSelectedButton.disabled = selected === 0;
  trashSelectedButton.disabled = selected === 0;
}

function renderInventory() {
  tabsRoot.replaceChildren();
  count.textContent = `${inventory.length} in this window`;
  for (const tab of inventory) {
    const row = document.createElement("label");
    row.className = `tab-row${tab.eligibility.capturable ? "" : " restricted"}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = String(tab.id);
    checkbox.disabled = !tab.eligibility.capturable;
    checkbox.checked = tab.eligibility.capturable && !tab.pinned;
    checkbox.addEventListener("change", syncCaptureButtons);
    const icon = document.createElement("span");
    icon.className = "favicon";
    icon.textContent = tab.eligibility.capturable
      ? new URL(tab.url).hostname[0]?.toUpperCase() || "↗"
      : "⊘";
    const copy = document.createElement("span");
    copy.className = "tab-copy";
    const title = document.createElement("strong");
    title.textContent = tab.title || "Untitled tab";
    const detail = document.createElement("small");
    detail.textContent = tab.eligibility.capturable
      ? `${tab.pinned ? "Pinned · " : ""}${new URL(tab.url).hostname}`
      : tab.eligibility.reason;
    copy.append(title, detail);
    row.append(checkbox, icon, copy);
    tabsRoot.append(row);
  }
  syncCaptureButtons();
}

function matchesSearch(item) {
  if (!searchQuery) return true;
  const haystack = `${item.title ?? ""} ${item.url ?? ""}`.toLowerCase();
  return haystack.includes(searchQuery);
}

function sortByOrder(list) {
  return [...list].sort((left, right) => {
    const leftOrder = Number.isFinite(left.order) ? left.order : 0;
    const rightOrder = Number.isFinite(right.order) ? right.order : 0;
    return leftOrder - rightOrder;
  });
}

function renderWorkspaces() {
  workspacesRoot.replaceChildren();
  const workspaces = sortByOrder(workspace.workspaces).filter((entry) => !entry.archived);
  if (workspaces.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-tree";
    empty.textContent = "Captured links will land in Saved tabs → Inbox.";
    workspacesRoot.append(empty);
    syncOrganizeButtons();
    return;
  }

  let visibleCount = 0;
  for (const ws of workspaces) {
    const groups = sortByOrder(
      workspace.groups.filter((group) => group.workspaceId === ws.id),
    );
    const block = document.createElement("section");
    block.className = "workspace-block";
    const heading = document.createElement("h3");
    heading.className = "workspace-title";
    heading.textContent = ws.title;
    block.append(heading);

    for (const group of groups) {
      const items = sortByOrder(
        workspace.items.filter(
          (item) => item.groupId === group.id && item.kind === "link" && matchesSearch(item),
        ),
      );
      if (searchQuery && items.length === 0) continue;
      visibleCount += items.length;

      const groupBlock = document.createElement("div");
      groupBlock.className = "group-block";
      const groupTitle = document.createElement("h4");
      groupTitle.className = "group-title";
      groupTitle.textContent = group.title;
      groupBlock.append(groupTitle);

      if (items.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-tree";
        empty.textContent = "No links in this group yet.";
        groupBlock.append(empty);
      }

      for (const item of items) {
        const row = document.createElement("label");
        row.className = "item-row";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "saved-item";
        checkbox.value = item.id;
        checkbox.addEventListener("change", syncOrganizeButtons);

        const copy = document.createElement("span");
        copy.className = "item-copy";
        const safeUrl = normalizeHttpUrl(item.url);
        if (safeUrl) {
          const link = document.createElement("a");
          link.href = safeUrl;
          link.target = "_blank";
          link.rel = "noreferrer";
          link.textContent = item.title || safeUrl;
          link.addEventListener("click", (event) => event.stopPropagation());
          const detail = document.createElement("small");
          detail.textContent = new URL(safeUrl).hostname;
          copy.append(link, detail);
        } else {
          const title = document.createElement("strong");
          title.textContent = item.title || "Unsafe link";
          const detail = document.createElement("span");
          detail.className = "unsafe";
          detail.textContent = String(item.url || "Invalid address — not clickable");
          copy.append(title, detail);
        }
        row.append(checkbox, copy);
        groupBlock.append(row);
      }
      block.append(groupBlock);
    }
    workspacesRoot.append(block);
  }

  if (searchQuery && visibleCount === 0) {
    workspacesRoot.replaceChildren();
    const empty = document.createElement("p");
    empty.className = "empty-tree";
    empty.textContent = "No saved links match that search.";
    workspacesRoot.append(empty);
  }
  syncOrganizeButtons();
}

async function renderSaved() {
  const state = await request({ type: "state" });
  savedRoot.replaceChildren();
  const items = state.items.slice(-8).reverse();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nothing saved yet. Your first capture will appear here.";
    savedRoot.append(empty);
    return;
  }
  for (const item of items) {
    const safeUrl = normalizeHttpUrl(item.url);
    if (safeUrl) {
      const link = document.createElement("a");
      link.href = safeUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      const title = document.createElement("strong");
      title.textContent = item.title;
      const domain = document.createElement("small");
      domain.textContent = new URL(safeUrl).hostname;
      link.append(title, domain);
      savedRoot.append(link);
    } else {
      const row = document.createElement("div");
      row.className = "saved-text";
      const title = document.createElement("strong");
      title.textContent = item.title || "Unsafe link";
      const detail = document.createElement("small");
      detail.textContent = "Address blocked — not opened as a link";
      row.append(title, detail);
      savedRoot.append(row);
    }
  }
}

async function loadWorkspace() {
  workspace = await request({ type: "workspaceState" });
  renderWorkspaces();
}

async function capture(close) {
  const ids = selectedTabIds();
  saveButton.disabled = closeButton.disabled = true;
  status.textContent = "Saving safely…";
  try {
    lastCommandId = crypto.randomUUID();
    const operation = await request({
      type: "capture",
      payload: {
        commandId: lastCommandId,
        tabIds: ids,
        close,
        duplicatePolicy: "skip",
      },
    });
    const saved = operation.items.length;
    const closeNote =
      operation.failedCloseIds?.length > 0
        ? ` · ${operation.failedCloseIds.length} close(s) failed`
        : "";
    status.textContent = `${saved} saved${
      operation.duplicateTabIds.length
        ? ` · ${operation.duplicateTabIds.length} duplicate(s) skipped`
        : ""
    }${closeNote}`;
    toastCopy.textContent = close
      ? `${operation.closedTabIds.length} tab(s) saved and closed.`
      : `${saved} tab(s) saved.`;
    toast.hidden = false;
    await Promise.all([loadInventory(), renderSaved(), loadWorkspace()]);
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : "Capture failed. No tabs were closed.";
    syncCaptureButtons();
  }
}

async function loadInventory() {
  inventory = await request({ type: "inventory" });
  renderInventory();
}

selectAll.addEventListener("change", () => {
  for (const input of tabsRoot.querySelectorAll("input:not(:disabled)")) {
    input.checked = selectAll.checked;
  }
  syncCaptureButtons();
});
saveButton.addEventListener("click", () => void capture(false));
closeButton.addEventListener("click", () => void capture(true));
undoButton.addEventListener("click", async () => {
  if (!lastCommandId) return;
  undoButton.disabled = true;
  try {
    await request({ type: "undo", commandId: lastCommandId });
    toast.hidden = true;
    status.textContent = "Capture undone and closed tabs restored.";
    await Promise.all([loadInventory(), renderSaved(), loadWorkspace()]);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Undo failed";
  } finally {
    undoButton.disabled = false;
  }
});

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  renderWorkspaces();
});

restoreSelectedButton.addEventListener("click", async () => {
  const itemIds = selectedSavedIds();
  if (itemIds.length === 0) return;
  restoreSelectedButton.disabled = true;
  try {
    const result = await request({
      type: "restore",
      payload: {
        commandId: crypto.randomUUID(),
        itemIds,
        duplicatePolicy: "skip",
      },
    });
    const parts = [`${result.openedIds.length} opened`];
    if (result.skippedIds.length) parts.push(`${result.skippedIds.length} already open`);
    if (result.failedIds.length) parts.push(`${result.failedIds.length} failed`);
    status.textContent = parts.join(" · ");
    await loadInventory();
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Restore failed";
  } finally {
    syncOrganizeButtons();
  }
});

trashSelectedButton.addEventListener("click", async () => {
  const itemIds = selectedSavedIds();
  if (itemIds.length === 0) return;
  trashSelectedButton.disabled = true;
  try {
    for (const itemId of itemIds) {
      await request({
        type: "applyWorkspaceCommand",
        command: {
          type: "trashItem",
          commandId: crypto.randomUUID(),
          itemId,
        },
      });
    }
    status.textContent = `${itemIds.length} link(s) moved to trash.`;
    await loadWorkspace();
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Could not trash selection";
    syncOrganizeButtons();
  }
});

newWorkspaceButton.addEventListener("click", async () => {
  const title = window.prompt("New workspace name", "Research");
  if (!title?.trim()) return;
  try {
    await request({
      type: "applyWorkspaceCommand",
      command: {
        type: "createWorkspace",
        commandId: crypto.randomUUID(),
        title: title.trim().slice(0, 100),
        color: "#0f766e",
      },
    });
    await loadWorkspace();
    status.textContent = `Workspace “${title.trim()}” created.`;
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Could not create workspace";
  }
});

newGroupButton.addEventListener("click", async () => {
  const active = sortByOrder(workspace.workspaces).find((entry) => !entry.archived);
  if (!active) {
    status.textContent = "Create a workspace before adding a group.";
    return;
  }
  const title = window.prompt(`New group in “${active.title}”`, "Inbox");
  if (!title?.trim()) return;
  try {
    await request({
      type: "applyWorkspaceCommand",
      command: {
        type: "createGroup",
        commandId: crypto.randomUUID(),
        workspaceId: active.id,
        title: title.trim().slice(0, 100),
      },
    });
    await loadWorkspace();
    status.textContent = `Group “${title.trim()}” created.`;
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Could not create group";
  }
});

void Promise.all([loadInventory(), renderSaved(), loadWorkspace()]).catch((error) => {
  status.textContent = error instanceof Error ? error.message : "Tabby could not start.";
});
