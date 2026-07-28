import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  COMMAND_LOG_LIMIT,
  CONTRACT_LIMITS,
  DomainError,
  InMemoryWorkspaceRepository,
  applyCommand,
  migrateWorkspaceExport,
  orderBetween,
  rebalanceOrders,
} from "../packages/workspace-contracts/index.js";

const fixture = JSON.parse(
  await readFile(
    new URL("./fixtures/web-workspace-v1.json", import.meta.url),
    "utf8",
  ),
);
const NOW = "2026-07-28T12:00:00.000Z";

function seededState() {
  return migrateWorkspaceExport(structuredClone(fixture));
}

function apply(state, command, extras = {}) {
  return applyCommand(
    {
      state,
      trash: extras.trash,
      commandLog: extras.commandLog,
      now: () => NOW,
      createId: extras.createId,
    },
    command,
  );
}

test("duplicate commandId is idempotent and returns the prior result", () => {
  const first = apply(seededState(), {
    type: "createItem",
    commandId: "cmd-create-note",
    id: "note-1",
    groupId: "group-1",
    kind: "note",
    title: "Scratch",
    content: "hello",
  });
  assert.equal(first.state.items.length, 3);
  assert.equal(first.commandLog.length, 1);

  const second = apply(
    first.state,
    {
      type: "createItem",
      commandId: "cmd-create-note",
      id: "note-should-not-appear",
      groupId: "group-1",
      kind: "note",
      title: "Ignored",
    },
    { commandLog: first.commandLog, trash: first.trash },
  );

  assert.equal(second.state.items.length, 3);
  assert.deepEqual(second.result, first.result);
  assert.equal(
    second.state.items.some((item) => item.id === "note-should-not-appear"),
    false,
  );
  assert.equal(second.commandLog.length, 1);
});

test("createItem rejects unsafe URLs", () => {
  assert.throws(
    () =>
      apply(seededState(), {
        type: "createItem",
        commandId: "cmd-bad-url",
        id: "link-bad",
        groupId: "group-1",
        kind: "link",
        title: "Evil",
        url: "javascript:alert(1)",
      }),
    (error) =>
      error instanceof DomainError &&
      error.category === "validation" &&
      /Link URL/.test(error.message),
  );

  assert.throws(
    () =>
      apply(seededState(), {
        type: "createItem",
        commandId: "cmd-creds",
        id: "link-creds",
        groupId: "group-1",
        kind: "link",
        title: "Leak",
        url: "https://user:pass@example.com/",
      }),
    (error) => error instanceof DomainError && error.category === "validation",
  );
});

test("enforces collection quotas", () => {
  const state = seededState();
  state.workspaces = Array.from(
    { length: CONTRACT_LIMITS.workspaces },
    (_, index) => ({
      id: `ws-${index}`,
      title: `Workspace ${index}`,
      color: "#112233",
      archived: false,
      order: index,
    }),
  );

  assert.throws(
    () =>
      apply(state, {
        type: "createWorkspace",
        commandId: "cmd-quota",
        id: "ws-overflow",
        title: "Overflow",
        color: "#abcdef",
      }),
    (error) =>
      error instanceof DomainError &&
      error.category === "quota" &&
      error.code === "workspaces_quota",
  );
});

test("trashItem soft-deletes with a tombstone and restoreItem brings it back", () => {
  const trashed = apply(seededState(), {
    type: "trashItem",
    commandId: "cmd-trash",
    itemId: "link-1",
    tombstoneId: "tomb-1",
  });
  assert.equal(
    trashed.state.items.some((item) => item.id === "link-1"),
    false,
  );
  assert.equal(trashed.trash.items[0].id, "link-1");
  assert.deepEqual(trashed.trash.tombstones[0], {
    id: "tomb-1",
    entityId: "link-1",
    entityType: "item",
    deletedAt: NOW,
  });

  const restored = apply(
    trashed.state,
    {
      type: "restoreItem",
      commandId: "cmd-restore",
      itemId: "link-1",
    },
    { trash: trashed.trash, commandLog: trashed.commandLog },
  );

  assert.equal(
    restored.state.items.some((item) => item.id === "link-1"),
    true,
  );
  assert.equal(restored.trash.items.length, 0);
  assert.equal(restored.trash.tombstones.length, 0);
});

test("reorder rebalances when fractional precision is exhausted", () => {
  const state = seededState();
  const left = 1;
  const right = 1 + Number.EPSILON;
  assert.throws(() => orderBetween(left, right), /precision is exhausted/);

  state.items = state.items.map((item) => {
    if (item.id === "link-1") return { ...item, order: left };
    if (item.id === "task-1") return { ...item, order: right };
    return item;
  });

  const rebalanced = rebalanceOrders(state.items);
  assert.deepEqual(
    rebalanced.map((item) => item.order),
    [0, 1],
  );

  const moved = apply(state, {
    type: "createItem",
    commandId: "cmd-insert-between",
    id: "note-mid",
    groupId: "group-1",
    kind: "note",
    title: "Between",
    beforeId: "link-1",
    afterId: "task-1",
  });

  const byId = Object.fromEntries(
    moved.state.items.map((item) => [item.id, item]),
  );
  assert.equal(byId["link-1"].order, 0);
  assert.equal(byId["task-1"].order, 1);
  assert.ok(byId["note-mid"].order > byId["link-1"].order);
  assert.ok(byId["note-mid"].order < byId["task-1"].order);
});

test("InMemoryWorkspaceRepository executes commands and preserves the command log cap", async () => {
  const repository = new InMemoryWorkspaceRepository({ state: seededState() });
  const created = await repository.execute(
    {
      type: "renameWorkspace",
      commandId: "cmd-rename",
      workspaceId: "ws-1",
      title: "Renamed",
    },
    { now: () => NOW },
  );
  assert.equal(created.state.workspaces[0].title, "Renamed");

  const log = Array.from({ length: COMMAND_LOG_LIMIT }, (_, index) => ({
    commandId: `old-${index}`,
    type: "exportSnapshot",
    appliedAt: NOW,
    result: { ok: true },
  }));
  await repository.save({
    state: created.state,
    trash: created.trash,
    commandLog: log,
  });
  const next = await repository.execute(
    {
      type: "archiveWorkspace",
      commandId: "cmd-archive",
      workspaceId: "ws-1",
      archived: true,
    },
    { now: () => NOW },
  );
  assert.equal(next.commandLog.length, COMMAND_LOG_LIMIT);
  assert.equal(next.commandLog[0].commandId, "old-1");
  assert.equal(next.commandLog.at(-1)?.commandId, "cmd-archive");
  assert.equal(next.state.workspaces[0].archived, true);
});
