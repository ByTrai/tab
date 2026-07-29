import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyExportToMemory,
  createEmptyEntityState,
  memoryRepository,
} from "../packages/local-store/index.js";
import {
  migrateWorkspaceExport,
  serializeWorkspaceExport,
} from "../packages/workspace-contracts/index.js";

const webFixture = JSON.parse(
  await readFile(
    new URL("./fixtures/web-workspace-v1.json", import.meta.url),
    "utf8",
  ),
);

test("memory repository round-trips a workspace export", async () => {
  const repo = memoryRepository();
  const canonical = migrateWorkspaceExport(webFixture);
  await repo.replaceFromExport(canonical);
  const loaded = await repo.loadExport();
  assert.equal(loaded.schemaVersion, 2);
  assert.equal(
    serializeWorkspaceExport(loaded),
    serializeWorkspaceExport(canonical),
  );
  const again = applyExportToMemory(createEmptyEntityState(), loaded);
  assert.equal(
    serializeWorkspaceExport({
      schemaVersion: 2,
      workspaces: again.workspaces,
      groups: again.groups,
      items: again.items,
    }),
    serializeWorkspaceExport(canonical),
  );
});

test("trashItem and restoreFromTrash preserve the item snapshot", async () => {
  const repo = memoryRepository();
  await repo.replaceFromExport(migrateWorkspaceExport(webFixture));
  const before = await repo.loadExport();
  const itemId = before.items[0].id;

  await repo.trashItem(itemId, { deletedAt: "2026-07-28T12:00:00.000Z" });
  const trashedExport = await repo.loadExport();
  assert.equal(
    trashedExport.items.some((item) => item.id === itemId),
    false,
  );
  const trash = await repo.listTrash();
  assert.equal(trash.length, 1);
  assert.equal(trash[0].entityId, itemId);
  assert.equal(trash[0].entityType, "item");
  assert.equal(trash[0].deletedAt, "2026-07-28T12:00:00.000Z");

  await repo.restoreFromTrash(trash[0].id);
  const restored = await repo.loadExport();
  assert.equal(
    serializeWorkspaceExport(restored),
    serializeWorkspaceExport(before),
  );
  assert.equal((await repo.listTrash()).length, 0);
});

test("migrateFromLegacyWebAggregate upgrades web v1 via migrateWorkspaceExport", async () => {
  const repo = memoryRepository();
  const snapshot = structuredClone(webFixture);
  await repo.migrateFromLegacyWebAggregate(webFixture);
  assert.deepEqual(webFixture, snapshot);

  const loaded = await repo.loadExport();
  const expected = migrateWorkspaceExport(snapshot);
  assert.equal(
    serializeWorkspaceExport(loaded),
    serializeWorkspaceExport(expected),
  );
  const all = await repo.getAll();
  assert.equal(all.meta.migratedWeb, true);
  assert.equal(all.workspaces[0].color, "#7157d9");
  assert.equal(all.items[0].url, "https://example.com/read#intro");
});

test("commitCaptureOperation is idempotent by operation id", async () => {
  const repo = memoryRepository();
  const operation = { id: "op-1", stage: "persisted", items: [] };
  const items = [
    {
      id: "capture-1",
      kind: "link",
      title: "A",
      url: "https://example.com/a",
      createdAt: "2026-07-27T12:00:00.000Z",
      tabId: 1,
      pinned: false,
      index: 0,
    },
  ];

  await repo.commitCaptureOperation(operation, items);
  await repo.commitCaptureOperation({ ...operation, stage: "closing" }, [
    { ...items[0], title: "changed" },
  ]);

  const links = await repo.savedLinkItems();
  assert.equal(links.length, 1);
  assert.equal(links[0].title, "A");
  const operations = await repo.listOperations();
  assert.equal(operations.length, 1);
  assert.equal(operations[0].stage, "persisted");
  assert.deepEqual(await repo.getOperation("op-1"), operation);

  await repo.updateOperation({ ...operation, stage: "complete" });
  assert.equal((await repo.getOperation("op-1")).stage, "complete");
});

test("purgeExpiredTrash removes records older than the retention cutoff", async () => {
  const repo = memoryRepository();
  await repo.replaceFromExport(migrateWorkspaceExport(webFixture));
  const itemId = (await repo.loadExport()).items[0].id;
  await repo.trashItem(itemId, { deletedAt: "2026-01-01T00:00:00.000Z" });

  const result = await repo.purgeExpiredTrash({
    deletedBefore: "2026-06-01T00:00:00.000Z",
  });
  assert.equal(result.purged, 1);
  assert.equal((await repo.listTrash()).length, 0);
});

test("migrateFromLegacyWebAggregate preserves trash and command log extras", async () => {
  const repo = memoryRepository();
  const legacy = {
    ...structuredClone(webFixture),
    trash: {
      items: [
        {
          id: "trashed-1",
          groupId: webFixture.groups[0].id,
          kind: "note",
          title: "Soft deleted",
          content: "gone",
          createdAt: "2026-07-01T00:00:00.000Z",
          order: 9,
        },
      ],
      tombstones: [
        {
          id: "tomb-1",
          entityId: "trashed-1",
          entityType: "item",
          deletedAt: "2026-07-02T00:00:00.000Z",
        },
      ],
    },
    commandLog: [
      {
        commandId: "cmd-1",
        type: "createItem",
        appliedAt: "2026-07-02T00:00:00.000Z",
        result: { ok: true },
      },
    ],
  };

  await repo.migrateFromLegacyWebAggregate(legacy);
  const trash = await repo.listTrash();
  assert.equal(trash.length, 1);
  assert.equal(trash[0].entityId, "trashed-1");
  assert.equal(trash[0].deletedAt, "2026-07-02T00:00:00.000Z");
  const commandLog = await repo.getMeta("commandLog");
  assert.equal(Array.isArray(commandLog) && commandLog.length, 1);
});

test("trashRecordsToBundle round-trips item snapshots", async () => {
  const { trashRecordsToBundle, trashBundleToRecords } =
    await import("../packages/local-store/index.js");
  const repo = memoryRepository();
  await repo.replaceFromExport(migrateWorkspaceExport(webFixture));
  const item = (await repo.loadExport()).items[0];
  await repo.trashItem(item.id, { deletedAt: "2026-07-28T12:00:00.000Z" });
  const bundle = trashRecordsToBundle(await repo.listTrash());
  assert.equal(bundle.items.length, 1);
  assert.equal(bundle.tombstones.length, 1);
  const records = trashBundleToRecords(bundle);
  assert.equal(records[0].entityId, item.id);
  assert.equal(records[0].snapshot.title, item.title);
});
