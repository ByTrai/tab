/**
 * Local-store timing probe for T9.2 budgets.
 * Records 1k/10k/50k results instead of asserting hard CI failure thresholds.
 *
 * Env:
 *   BENCH_SIZES=1000,10000,50000  (default)
 *   BENCH_OUT=artifacts/bench-local-store.json
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { memoryRepository } from "../apps/extension/packages/local-store/index.js";
import {
  migrateWorkspaceExport,
  serializeWorkspaceExport,
} from "../apps/extension/packages/workspace-contracts/index.js";

const sizes = String(process.env.BENCH_SIZES ?? "1000,10000,50000")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);

const outPath =
  process.env.BENCH_OUT ?? path.resolve("artifacts/bench-local-store.json");

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

function runSize(itemCount) {
  const payload = buildExport(itemCount);
  const repo = memoryRepository();

  const tReplace = performance.now();
  // replaceFromExport is async; callers await the returned promise.
  return (async () => {
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

    return {
      items: itemCount,
      replaceMs: Number(replaceMs.toFixed(2)),
      loadMs: Number(loadMs.toFixed(2)),
      searchMs: Number(searchMs.toFixed(2)),
      serializeMs: Number(serializeMs.toFixed(2)),
      hits: hits.length,
      exportBytes: serialized.length,
    };
  })();
}

const runs = [];
for (const size of sizes) {
  runs.push(await runSize(size));
}

const report = {
  recordedAt: new Date().toISOString(),
  runtime: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  targets: {
    localCommandP95Ms: 100,
    indexedSearchP95Ms: 100,
    note: "Targets are guidance only; this script records, it does not fail CI.",
  },
  runs,
};

console.log(JSON.stringify(report, null, 2));
await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.error(`Wrote ${outPath}`);
