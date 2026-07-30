import assert from "node:assert/strict";
import test from "node:test";
import { CaptureService } from "../core.js";
import { FakeBrowser, FakeRepository } from "./fakes.js";

function service(browser, repository) {
  return new CaptureService({
    browser,
    repository,
    now: () => "2026-07-29T12:00:00.000Z",
    createId: () => "generated-id",
  });
}

function linkItem({
  id = "item-1",
  tabId = 11,
  url = "https://example.com/a",
  title = "A",
  pinned = false,
  index = 0,
} = {}) {
  return {
    id,
    kind: "link",
    tabId,
    url,
    title,
    capturedAt: "2026-07-29T12:00:00.000Z",
    createdAt: "2026-07-29T12:00:00.000Z",
    pinned,
    index,
  };
}

async function seedOperation(repository, operation, items = operation.items) {
  await repository.commitCapture(operation, items);
}

test("recovery matrix: saved without close is a no-op (items kept, tabs untouched)", async () => {
  const browser = new FakeBrowser([
    {
      id: 11,
      url: "https://example.com/a",
      title: "A",
      pinned: false,
      index: 0,
    },
  ]);
  const repository = new FakeRepository();
  const item = linkItem();
  await seedOperation(repository, {
    id: "op-saved",
    stage: "saved",
    closeRequested: false,
    createdAt: "2026-07-29T12:00:00.000Z",
    items: [item],
    duplicateTabIds: [],
    closedTabIds: [],
    failedCloseIds: [],
  });

  const recovered = await service(browser, repository).recoverInterrupted();
  assert.equal(recovered.length, 0);
  assert.equal((await repository.operation("op-saved")).stage, "saved");
  assert.equal(repository.items.length, 1);
  assert.equal(
    browser.tabs.some((tab) => tab.id === 11),
    true,
  );
});

test("recovery matrix: saved+closeRequested resumes close after worker restart", async () => {
  const browser = new FakeBrowser([
    {
      id: 11,
      url: "https://example.com/a",
      title: "A",
      pinned: false,
      index: 0,
    },
  ]);
  const repository = new FakeRepository();
  const item = linkItem();
  await seedOperation(repository, {
    id: "op-saved-close",
    stage: "saved",
    closeRequested: true,
    createdAt: "2026-07-29T12:00:00.000Z",
    items: [item],
    duplicateTabIds: [],
    closedTabIds: [],
    failedCloseIds: [],
  });

  const recovered = await service(browser, repository).recoverInterrupted();
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].stage, "closed");
  assert.deepEqual(recovered[0].closedTabIds, [11]);
  assert.equal(
    browser.tabs.some((tab) => tab.id === 11),
    false,
  );
  assert.equal(repository.items.length, 1);
});

test("recovery matrix: closing with tabs still open retries closeTabs", async () => {
  const browser = new FakeBrowser([
    {
      id: 11,
      url: "https://example.com/a",
      title: "A",
      pinned: false,
      index: 0,
    },
  ]);
  const repository = new FakeRepository();
  const item = linkItem();
  await seedOperation(repository, {
    id: "op-closing-open",
    stage: "closing",
    closeRequested: true,
    createdAt: "2026-07-29T12:00:00.000Z",
    items: [item],
    duplicateTabIds: [],
    closedTabIds: [11],
    failedCloseIds: [],
  });

  const recovered = await service(browser, repository).recoverInterrupted();
  assert.equal(recovered[0].stage, "closed");
  assert.deepEqual(recovered[0].closedTabIds, [11]);
  assert.equal(browser.closed.includes(11), true);
});

test("recovery matrix: closing with partial failedCloseIds retries remaining tabs", async () => {
  const browser = new FakeBrowser(
    [
      {
        id: 11,
        url: "https://example.com/a",
        title: "A",
        pinned: false,
        index: 0,
      },
      {
        id: 12,
        url: "https://example.com/b",
        title: "B",
        pinned: false,
        index: 1,
      },
    ],
    { failCloseIds: [12] },
  );
  const repository = new FakeRepository();
  const items = [
    linkItem({ id: "item-1", tabId: 11, url: "https://example.com/a" }),
    linkItem({
      id: "item-2",
      tabId: 12,
      url: "https://example.com/b",
      title: "B",
      index: 1,
    }),
  ];
  await seedOperation(
    repository,
    {
      id: "op-partial",
      stage: "closing",
      closeRequested: true,
      createdAt: "2026-07-29T12:00:00.000Z",
      items,
      duplicateTabIds: [],
      closedTabIds: [11],
      failedCloseIds: [12],
    },
    items,
  );
  // Tab 11 already closed in a prior attempt.
  browser.tabs = browser.tabs.filter((tab) => tab.id !== 11);

  const recovered = await service(browser, repository).recoverInterrupted();
  assert.equal(recovered[0].stage, "closing");
  assert.deepEqual(recovered[0].closedTabIds, [11]);
  assert.deepEqual(recovered[0].failedCloseIds, [12]);
  assert.equal(
    browser.tabs.some((tab) => tab.id === 12),
    true,
  );
});

test("recovery matrix: mid-undoing resumes only remaining restores", async () => {
  const browser = new FakeBrowser([]);
  const repository = new FakeRepository();
  const items = [
    linkItem({
      id: "item-1",
      tabId: 11,
      url: "https://example.com/a",
      index: 0,
    }),
    linkItem({
      id: "item-2",
      tabId: 12,
      url: "https://example.com/b",
      title: "B",
      index: 1,
    }),
  ];
  repository.items = structuredClone(items);
  await seedOperation(
    repository,
    {
      id: "op-undoing",
      stage: "undoing",
      closeRequested: true,
      createdAt: "2026-07-29T12:00:00.000Z",
      items,
      duplicateTabIds: [],
      closedTabIds: [11, 12],
      restoredItemIds: ["item-1"],
      failedRestoreIds: [],
    },
    [],
  );

  const recovered = await service(browser, repository).recoverInterrupted();
  assert.equal(recovered[0].stage, "undone");
  assert.deepEqual(recovered[0].restoredItemIds, ["item-1", "item-2"]);
  assert.deepEqual(
    browser.opened.map(({ url }) => url),
    ["https://example.com/b"],
  );
  assert.equal(repository.items.length, 0);
});

test("recovery matrix: terminal closed and undone stages are ignored", async () => {
  const browser = new FakeBrowser([]);
  const repository = new FakeRepository();
  await seedOperation(repository, {
    id: "op-closed",
    stage: "closed",
    closeRequested: true,
    createdAt: "2026-07-29T12:00:00.000Z",
    items: [linkItem()],
    duplicateTabIds: [],
    closedTabIds: [11],
    failedCloseIds: [],
  });
  await seedOperation(repository, {
    id: "op-undone",
    stage: "undone",
    closeRequested: true,
    createdAt: "2026-07-29T12:00:00.000Z",
    items: [linkItem({ id: "item-2", tabId: 12 })],
    duplicateTabIds: [],
    closedTabIds: [12],
    failedCloseIds: [],
  });

  const recovered = await service(browser, repository).recoverInterrupted();
  assert.equal(recovered.length, 0);
});

test("recovery matrix: updateOperation failure during closing leaves durable items", async () => {
  const browser = new FakeBrowser([
    {
      id: 11,
      url: "https://example.com/a",
      title: "A",
      pinned: false,
      index: 0,
    },
  ]);
  const repository = new FakeRepository({ failUpdateOnStage: "closing" });
  await assert.rejects(
    () =>
      service(browser, repository).capture({
        commandId: "op-fail-update",
        tabIds: [11],
        close: true,
      }),
    /Injected update failure/,
  );
  // Durable save happened before the closing transition failed.
  assert.equal(repository.items.length, 1);
  assert.equal((await repository.operation("op-fail-update")).stage, "saved");
  assert.equal(
    browser.tabs.some((tab) => tab.id === 11),
    true,
  );

  // Clear the injection so recovery can finish the close.
  repository.failUpdateOnStage = null;
  const recovered = await service(browser, repository).recoverInterrupted();
  assert.equal(recovered[0].stage, "closed");
  assert.equal(
    browser.tabs.some((tab) => tab.id === 11),
    false,
  );
});

test("recovery matrix: capture never closes tabs before the saved journal write", async () => {
  const browser = new FakeBrowser([
    {
      id: 11,
      url: "https://example.com/a",
      title: "A",
      pinned: false,
      index: 0,
    },
  ]);
  const repository = new FakeRepository({ failCommit: true });
  await assert.rejects(
    () =>
      service(browser, repository).capture({
        commandId: "op-fail-commit",
        tabIds: [11],
        close: true,
      }),
    /Injected storage failure/,
  );
  assert.equal(repository.items.length, 0);
  assert.equal(repository.journal.length, 0);
  assert.equal(browser.closed.length, 0);
  assert.equal(
    browser.tabs.some((tab) => tab.id === 11),
    true,
  );
});
