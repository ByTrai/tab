import assert from "node:assert/strict";
import test from "node:test";
import {
  CAPTURE_STATE_SCHEMA_VERSION,
  migrateCaptureState,
  normalizedUrlKey,
  normalizeHttpUrl,
} from "../packages/workspace-contracts/index.js";
import { readCompatibleState } from "../repository.js";

test("normalizes only navigable HTTP(S) URLs", () => {
  assert.equal(
    normalizeHttpUrl(" https://Example.com/path?q=1#read "),
    "https://example.com/path?q=1#read",
  );
  assert.equal(
    normalizedUrlKey("https://example.com/path#one"),
    "https://example.com/path",
  );
  assert.equal(normalizeHttpUrl("javascript:alert(1)"), null);
  assert.equal(normalizeHttpUrl("file:///private/file"), null);
  assert.equal(normalizeHttpUrl("https://user:secret@example.com"), null);
  assert.equal(
    normalizeHttpUrl({ toString: () => "https://example.com" }),
    null,
  );
});

test("migrates a persisted v1 capture journal without losing recovery fields", () => {
  const legacy = {
    schemaVersion: 1,
    items: [
      {
        id: "item-1",
        tabId: 12,
        url: "https://example.com/article#section",
        title: "Article",
        capturedAt: "2026-07-26T00:00:00.000Z",
        pinned: false,
        index: 3,
      },
    ],
    operations: [
      {
        id: "operation-1",
        stage: "closing",
        closedTabIds: [12],
        items: [],
      },
    ],
  };

  const migrated = migrateCaptureState(legacy);
  assert.equal(migrated.schemaVersion, CAPTURE_STATE_SCHEMA_VERSION);
  assert.deepEqual(migrated.items[0], {
    ...legacy.items[0],
    kind: "link",
    createdAt: legacy.items[0].capturedAt,
  });
  assert.equal(migrated.operations[0].stage, "closing");
  assert.equal(
    legacy.schemaVersion,
    1,
    "migration must not mutate the stored snapshot",
  );
});

test("reads empty and current states while rejecting unknown versions", () => {
  assert.deepEqual(readCompatibleState(undefined), {
    schemaVersion: 2,
    items: [],
    operations: [],
  });
  const current = {
    schemaVersion: 2,
    items: [],
    operations: [],
    deviceId: "local",
  };
  assert.deepEqual(readCompatibleState(current), current);
  assert.throws(
    () => readCompatibleState({ schemaVersion: 99, items: [], operations: [] }),
    /Unsupported capture state schema version/,
  );
});
