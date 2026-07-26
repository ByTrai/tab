const tabsRoot = document.querySelector("#tabs");
const savedRoot = document.querySelector("#saved");
const status = document.querySelector("#status");
const count = document.querySelector("#count");
const selectAll = document.querySelector("#select-all");
const saveButton = document.querySelector("#save");
const closeButton = document.querySelector("#save-close");
const toast = document.querySelector("#toast");
const toastCopy = document.querySelector("#toast-copy");
const undoButton = document.querySelector("#undo");

let inventory = [];
let lastCommandId = null;

async function request(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || "The extension did not respond.");
  return response.value;
}

function selectedIds() {
  return [...tabsRoot.querySelectorAll("input:checked")].map((input) => Number(input.value));
}

function syncButtons() {
  const selected = selectedIds().length;
  saveButton.disabled = selected === 0;
  closeButton.disabled = selected === 0;
  status.textContent = selected ? `${selected} selected` : "Select tabs to continue";
}

function renderInventory() {
  tabsRoot.replaceChildren();
  count.textContent = `${inventory.length} in this window`;
  for (const tab of inventory) {
    const row = document.createElement("label");
    row.className = `tab-row${tab.eligibility.capturable ? "" : " restricted"}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = tab.id;
    checkbox.disabled = !tab.eligibility.capturable;
    checkbox.checked = tab.eligibility.capturable && !tab.pinned;
    checkbox.addEventListener("change", syncButtons);
    const icon = document.createElement("span");
    icon.className = "favicon";
    icon.textContent = tab.eligibility.capturable ? new URL(tab.url).hostname[0]?.toUpperCase() || "↗" : "⊘";
    const copy = document.createElement("span");
    copy.className = "tab-copy";
    const title = document.createElement("strong");
    title.textContent = tab.title || "Untitled tab";
    const detail = document.createElement("small");
    detail.textContent = tab.eligibility.capturable ? `${tab.pinned ? "Pinned · " : ""}${new URL(tab.url).hostname}` : tab.eligibility.reason;
    copy.append(title, detail);
    row.append(checkbox, icon, copy);
    tabsRoot.append(row);
  }
  syncButtons();
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
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const domain = document.createElement("small");
    domain.textContent = new URL(item.url).hostname;
    link.append(title, domain);
    savedRoot.append(link);
  }
}

async function capture(close) {
  const ids = selectedIds();
  saveButton.disabled = closeButton.disabled = true;
  status.textContent = "Saving safely…";
  try {
    lastCommandId = crypto.randomUUID();
    const operation = await request({ type: "capture", payload: { commandId: lastCommandId, tabIds: ids, close, duplicatePolicy: "skip" } });
    const saved = operation.items.length;
    status.textContent = `${saved} saved${operation.duplicateTabIds.length ? ` · ${operation.duplicateTabIds.length} duplicate(s) skipped` : ""}`;
    toastCopy.textContent = close ? `${operation.closedTabIds.length} tab(s) saved and closed.` : `${saved} tab(s) saved.`;
    toast.hidden = false;
    await Promise.all([loadInventory(), renderSaved()]);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Capture failed. No tabs were closed.";
    syncButtons();
  }
}

async function loadInventory() {
  inventory = await request({ type: "inventory" });
  renderInventory();
}

selectAll.addEventListener("change", () => {
  for (const input of tabsRoot.querySelectorAll("input:not(:disabled)")) input.checked = selectAll.checked;
  syncButtons();
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
    await Promise.all([loadInventory(), renderSaved()]);
  } catch (error) { status.textContent = error instanceof Error ? error.message : "Undo failed"; }
  finally { undoButton.disabled = false; }
});

void Promise.all([loadInventory(), renderSaved()]).catch((error) => {
  status.textContent = error instanceof Error ? error.message : "Tabby could not start.";
});
