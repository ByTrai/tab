import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CONTRACT_LIMITS,
  isClientId,
  isUtcTimestamp,
  migrateWorkspaceExport,
  orderBetween,
  serializeWorkspaceExport,
} from "../packages/workspace-contracts/index.js";

const fixture = JSON.parse(await readFile(new URL("./fixtures/web-workspace-v1.json", import.meta.url), "utf8"));

test("migrates web schema v1 deterministically without mutating the fixture", () => {
  const snapshot = structuredClone(fixture);
  const migrated = migrateWorkspaceExport(fixture);
  assert.equal(migrated.schemaVersion, 2);
  assert.deepEqual(migrated.workspaces[0], { ...fixture.workspaces[0], color: "#7157d9", order: 0 });
  assert.equal(migrated.items[0].url, "https://example.com/read#intro");
  assert.equal(migrated.items[1].content, "");
  assert.deepEqual(fixture, snapshot);
  assert.equal(serializeWorkspaceExport(migrated), serializeWorkspaceExport(migrateWorkspaceExport(snapshot)));
});

test("enforces canonical IDs, UTC timestamps, and fractional ordering", () => {
  assert.equal(isClientId("client_01:item-2"), true);
  assert.equal(isClientId("../escape"), false);
  assert.equal(isUtcTimestamp("2026-07-27T12:00:00.000Z"), true);
  assert.equal(isUtcTimestamp("2026-07-27T14:00:00.000+02:00"), false);
  assert.equal(orderBetween(1, 2), 1.5);
  assert.throws(() => orderBetween(2, 1), /ascending/);
});

test("rejects malicious or inconsistent exports before canonicalization", () => {
  const unsafeUrl = structuredClone(fixture);
  unsafeUrl.items[0].url = "javascript:alert(1)";
  assert.throws(() => migrateWorkspaceExport(unsafeUrl), /Link URL/);

  const orphan = structuredClone(fixture);
  orphan.groups[0].workspaceId = "missing";
  assert.throws(() => migrateWorkspaceExport(orphan), /unknown workspace/);

  const duplicate = structuredClone(fixture);
  duplicate.items[0].id = duplicate.groups[0].id;
  assert.throws(() => migrateWorkspaceExport(duplicate), /Duplicate entity ID/);

  const oversized = { ...fixture, items: Array(CONTRACT_LIMITS.items + 1).fill(null) };
  assert.throws(() => migrateWorkspaceExport(oversized), /supported limit/);
  assert.throws(() => migrateWorkspaceExport({ ...fixture, schemaVersion: 99 }), /Unsupported/);
});

test("keeps current capture journals and rejects oversized or non-UTC legacy data", async () => {
  const { migrateCaptureState } = await import("../packages/workspace-contracts/index.js");
  const v1 = JSON.parse(await readFile(new URL("./fixtures/extension-journal-v1.json", import.meta.url), "utf8"));
  const v2 = JSON.parse(await readFile(new URL("./fixtures/extension-journal-v2.json", import.meta.url), "utf8"));
  assert.equal(migrateCaptureState(v1).items[0].kind, "link");
  assert.deepEqual(migrateCaptureState(v2), v2);
  assert.throws(() => migrateCaptureState({ ...v1, operations: Array(CONTRACT_LIMITS.captureOperations + 1).fill({ id: "x" }) }), /collection limits/);
  v1.items[0].capturedAt = "2026-07-27T14:00:00+02:00";
  assert.throws(() => migrateCaptureState(v1), /invalid item/);
});
