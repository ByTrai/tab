/**
 * Lightweight 1k-item local-store timing probe for T9.2 budgets.
 * Records results instead of asserting hard CI failure thresholds.
 */
import { performance } from "node:perf_hooks";
import { memoryRepository } from "../apps/extension/packages/local-store/index.js";
import {
  migrateWorkspaceExport,
  serializeWorkspaceExport,
} from "../apps/extension/packages/workspace-contracts/index.js";

const COUNT = Number(process.env.BENCH_ITEMS ?? 1000);

function buildExport(itemCount) {
  const workspaceId = "ws-bench";
  const groupId = "group-bench";
  const items = Array.from({ length: itemCount }, (_, index) => ({
    id: `item-${index}`,
    groupId,
    kind: index % 3 === 0 ? "note" : index % 3 === 1 ? "task" : "link",
    title: `Item ${index}`,
    content: index % 3 === 2 ? undefined : `Body ${index}`,
    url: index % 3 === 2 ? `https://example.com/${index}` : undefined,
    completed: index % 3 === 1 ? false : undefined,
    createdAt: "2026-07-28T12:00:00.000Z",
    order: index,
  }));
  return migrateWorkspaceExport({
    schemaVersion: 2,
    workspaces: [
      {
        id: workspaceId,
        title: "Bench",
        color: "#0f766e",
        archived: false,
        order: 0,
      },
    ],
    groups: [
      {
        id: groupId,
        workspaceId,
        title: "Inbox",
        collapsed: false,
        order: 0,
      },
    ],
    items,
  });
}

function search(items, query) {
  const needle = query.toLocaleLowerCase();
  return items.filter((item) =>
    [item.title, item.url, item.content]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(needle)),
  );
}

const payload = buildExport(COUNT);
const repo = memoryRepository();

const tReplace = performance.now();
await repo.replaceFromExport(payload);
const replaceMs = performance.now() - tReplace;

const tLoad = performance.now();
const loaded = await repo.loadExport();
const loadMs = performance.now() - tLoad;

const tSearch = performance.now();
const hits = search(loaded.items, "Item 42");
const searchMs = performance.now() - tSearch;

const tSerialize = performance.now();
const serialized = serializeWorkspaceExport(loaded);
const serializeMs = performance.now() - tSerialize;

const report = {
  items: COUNT,
  replaceMs: Number(replaceMs.toFixed(2)),
  loadMs: Number(loadMs.toFixed(2)),
  searchMs: Number(searchMs.toFixed(2)),
  serializeMs: Number(serializeMs.toFixed(2)),
  hits: hits.length,
  exportBytes: serialized.length,
  targets: {
    localCommandP95Ms: 100,
    indexedSearchP95Ms: 100,
  },
};

console.log(JSON.stringify(report, null, 2));
