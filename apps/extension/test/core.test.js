import assert from "node:assert/strict";
import test from "node:test";
import {
  CaptureService,
  classifyTab,
  DEFAULT_GROUP_TITLE,
  DEFAULT_WORKSPACE_TITLE,
} from "../core.js";
import { memoryRepository } from "../packages/local-store/index.js";
import { FakeBrowser, FakeRepository } from "./fakes.js";

const tabs = [
  {
    id: 1,
    index: 0,
    title: "Example",
    url: "https://example.com/a#section",
    pinned: false,
  },
  {
    id: 2,
    index: 1,
    title: "Pinned",
    url: "https://pinned.example/",
    pinned: true,
  },
  {
    id: 3,
    index: 2,
    title: "Settings",
    url: "chrome://settings",
    pinned: false,
  },
];

function service(browser, repository, entities = null) {
  let id = 0;
  return new CaptureService({
    browser,
    repository,
    entities,
    now: () => "2026-07-26T00:00:00.000Z",
    createId: () => `item-${++id}`,
  });
}

test("classifies restricted and invalid URLs without throwing", () => {
  assert.equal(classifyTab(tabs[0]).capturable, true);
  assert.deepEqual(classifyTab(tabs[2]), {
    capturable: false,
    reason: "Browser and local pages cannot be captured.",
  });
  assert.equal(
    classifyTab({ id: 4, url: "javascript:alert(1)" }).capturable,
    false,
  );
  assert.equal(classifyTab({ id: 5 }).capturable, false);
});

test("persists before closing and never closes pinned tabs", async () => {
  const browser = new FakeBrowser(tabs);
  const repository = new FakeRepository();
  const result = await service(browser, repository).capture({
    commandId: "command-1",
    tabIds: [1, 2],
    close: true,
  });
  assert.deepEqual(browser.closed, [1]);
  assert.equal(repository.items.length, 2);
  assert.equal(result.stage, "closed");
  assert.deepEqual(result.closedTabIds, [1]);
  assert.deepEqual(result.failedCloseIds, []);
});

test("storage failure closes no tabs", async () => {
  const browser = new FakeBrowser(tabs);
  const repository = new FakeRepository({ failCommit: true });
  await assert.rejects(
    service(browser, repository).capture({
      commandId: "command-2",
      tabIds: [1],
      close: true,
    }),
    /Injected storage failure/,
  );
  assert.deepEqual(browser.closed, []);
  assert.equal(repository.items.length, 0);
});

test("replayed command is idempotent and normalized duplicates are skipped", async () => {
  const browser = new FakeBrowser(tabs);
  const repository = new FakeRepository();
  const capture = service(browser, repository);
  await capture.capture({
    commandId: "same-command",
    tabIds: [1],
    close: false,
  });
  await capture.capture({
    commandId: "same-command",
    tabIds: [1],
    close: false,
  });
  const duplicate = await capture.capture({
    commandId: "different-command",
    tabIds: [1],
    close: false,
  });
  assert.equal(repository.items.length, 1);
  assert.deepEqual(duplicate.duplicateTabIds, [1]);
});

test("undo survives service reconstruction and restores only closed tabs", async () => {
  const browser = new FakeBrowser(tabs);
  const repository = new FakeRepository();
  await service(browser, repository).capture({
    commandId: "restart-command",
    tabIds: [1, 2],
    close: true,
  });
  const restartedService = service(browser, repository);
  const result = await restartedService.undo("restart-command");
  assert.equal(result.stage, "undone");
  assert.deepEqual(
    browser.opened.map(({ url }) => url),
    ["https://example.com/a#section"],
  );
  assert.equal(repository.items.length, 0);
  await restartedService.undo("restart-command");
  assert.equal(browser.opened.length, 1);
});

test("partial close failures do not claim a fully closed stage", async () => {
  const browser = new FakeBrowser(tabs, { failCloseIds: [1] });
  const repository = new FakeRepository();
  const result = await service(browser, repository).capture({
    commandId: "partial-close",
    tabIds: [1],
    close: true,
  });
  assert.equal(result.stage, "closing");
  assert.deepEqual(result.closedTabIds, []);
  assert.deepEqual(result.failedCloseIds, [1]);
  assert.equal(repository.items.length, 1);
  assert.equal(
    browser.tabs.some((tab) => tab.id === 1),
    true,
  );
});

test("recoverInterrupted marks closing ops closed when tabs are already gone", async () => {
  const browser = new FakeBrowser([]);
  const repository = new FakeRepository();
  await repository.commitCapture(
    {
      id: "interrupted-close",
      stage: "closing",
      closeRequested: true,
      createdAt: "2026-07-26T00:00:00.000Z",
      items: [
        {
          id: "item-1",
          kind: "link",
          tabId: 41,
          url: "https://example.com/gone",
          title: "Gone",
          capturedAt: "2026-07-26T00:00:00.000Z",
          createdAt: "2026-07-26T00:00:00.000Z",
          pinned: false,
          index: 0,
        },
      ],
      duplicateTabIds: [],
      closedTabIds: [41],
      failedCloseIds: [],
    },
    [],
  );

  const recovered = await service(browser, repository).recoverInterrupted();
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].stage, "closed");
  assert.deepEqual(recovered[0].closedTabIds, [41]);
  assert.deepEqual(recovered[0].failedCloseIds, []);
});

test("recoverInterrupted resumes an interrupted undo", async () => {
  const browser = new FakeBrowser([]);
  const repository = new FakeRepository();
  const item = {
    id: "item-undo",
    kind: "link",
    tabId: 7,
    url: "https://example.com/restore-me",
    title: "Restore me",
    capturedAt: "2026-07-26T00:00:00.000Z",
    createdAt: "2026-07-26T00:00:00.000Z",
    pinned: false,
    index: 0,
  };
  repository.items = [item];
  await repository.commitCapture(
    {
      id: "interrupted-undo",
      stage: "undoing",
      closeRequested: true,
      createdAt: "2026-07-26T00:00:00.000Z",
      items: [item],
      duplicateTabIds: [],
      closedTabIds: [7],
      restoredItemIds: [],
      failedRestoreIds: [],
    },
    [],
  );

  const recovered = await service(browser, repository).recoverInterrupted();
  assert.equal(recovered[0].stage, "undone");
  assert.deepEqual(
    browser.opened.map(({ url }) => url),
    ["https://example.com/restore-me"],
  );
  assert.equal(repository.items.length, 0);
});

test("restoreItems reports partial open failures and never claims full success", async () => {
  const browser = new FakeBrowser([], {
    failOpenUrls: ["https://fail.example/"],
  });
  const repository = new FakeRepository();
  repository.items = [
    {
      id: "ok-link",
      kind: "link",
      url: "https://ok.example/",
      title: "OK",
      createdAt: "2026-07-26T00:00:00.000Z",
      capturedAt: "2026-07-26T00:00:00.000Z",
      tabId: 1,
      pinned: false,
      index: 0,
    },
    {
      id: "bad-link",
      kind: "link",
      url: "https://fail.example/",
      title: "Fail",
      createdAt: "2026-07-26T00:00:00.000Z",
      capturedAt: "2026-07-26T00:00:00.000Z",
      tabId: 2,
      pinned: false,
      index: 1,
    },
  ];

  const result = await service(browser, repository).restoreItems({
    commandId: "restore-partial",
    itemIds: ["ok-link", "bad-link"],
    duplicatePolicy: "skip",
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.openedIds, ["ok-link"]);
  assert.deepEqual(result.failedIds, ["bad-link"]);
  assert.equal(browser.opened.length, 1);
});

test("restoreItems and openTab block javascript and credential URLs", async () => {
  const browser = new FakeBrowser([]);
  const repository = new FakeRepository();
  repository.items = [
    {
      id: "js-link",
      kind: "link",
      url: "javascript:alert(1)",
      title: "XSS",
      createdAt: "2026-07-26T00:00:00.000Z",
      capturedAt: "2026-07-26T00:00:00.000Z",
      tabId: 1,
      pinned: false,
      index: 0,
    },
    {
      id: "cred-link",
      kind: "link",
      url: "https://user:pass@evil.example/",
      title: "Creds",
      createdAt: "2026-07-26T00:00:00.000Z",
      capturedAt: "2026-07-26T00:00:00.000Z",
      tabId: 2,
      pinned: false,
      index: 1,
    },
  ];

  const result = await service(browser, repository).restoreItems({
    commandId: "restore-blocked",
    itemIds: ["js-link", "cred-link"],
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.openedIds, []);
  assert.deepEqual(result.failedIds, ["js-link", "cred-link"]);
  assert.deepEqual(result.blockedIds, ["js-link", "cred-link"]);
  assert.equal(browser.opened.length, 0);

  await assert.rejects(
    browser.openTab({ url: "javascript:alert(1)" }),
    /unsafe|credential/i,
  );
  await assert.rejects(
    browser.openTab({ url: "https://user:secret@example.com/" }),
    /unsafe|credential/i,
  );
});

test("undo re-validates URLs and skips unsafe addresses", async () => {
  const browser = new FakeBrowser([]);
  const repository = new FakeRepository();
  const unsafe = {
    id: "unsafe-item",
    kind: "link",
    tabId: 9,
    url: "javascript:alert(1)",
    title: "Bad",
    capturedAt: "2026-07-26T00:00:00.000Z",
    createdAt: "2026-07-26T00:00:00.000Z",
    pinned: false,
    index: 0,
  };
  repository.items = [unsafe];
  repository.journal = [
    {
      id: "undo-unsafe",
      stage: "closed",
      closeRequested: true,
      createdAt: "2026-07-26T00:00:00.000Z",
      items: [unsafe],
      duplicateTabIds: [],
      closedTabIds: [9],
    },
  ];

  const result = await service(browser, repository).undo("undo-unsafe");
  assert.equal(result.stage, "undone");
  assert.deepEqual(result.failedRestoreIds, ["unsafe-item"]);
  assert.equal(browser.opened.length, 0);
});

test("capture syncs links into the default Saved tabs / Inbox workspace", async () => {
  const browser = new FakeBrowser(tabs);
  const repository = new FakeRepository();
  const entities = memoryRepository();
  await service(browser, repository, entities).capture({
    commandId: "sync-entities",
    tabIds: [1],
    close: false,
  });

  const all = await entities.getAll();
  assert.equal(all.workspaces[0].title, DEFAULT_WORKSPACE_TITLE);
  assert.equal(all.groups[0].title, DEFAULT_GROUP_TITLE);
  assert.equal(all.items.length, 1);
  assert.equal(all.items[0].kind, "link");
  assert.equal(all.items[0].url, "https://example.com/a#section");
});

test("FakeBrowser capabilities advertise tabs-only Phase 1 surface", () => {
  const caps = new FakeBrowser([]).capabilities();
  assert.deepEqual(caps, {
    tabs: true,
    sessions: false,
    contextMenus: false,
    sidePanel: false,
  });
});

test("captureContextTarget saves an active page tab without closing", async () => {
  const browser = new FakeBrowser(tabs);
  const repository = new FakeRepository();
  const entities = memoryRepository();
  const result = await service(
    browser,
    repository,
    entities,
  ).captureContextTarget({
    commandId: "ctx-page",
    url: "https://example.com/a#section",
    title: "Example",
    tabId: 1,
  });
  assert.equal(result.stage, "saved");
  assert.equal(result.closeRequested, false);
  assert.equal(browser.tabs.length, 3);
  const all = await entities.getAll();
  assert.equal(all.items.length, 1);
});

test("captureContextTarget creates an inbox link for a bare URL", async () => {
  const browser = new FakeBrowser(tabs);
  const repository = new FakeRepository();
  const entities = memoryRepository();
  const result = await service(
    browser,
    repository,
    entities,
  ).captureContextTarget({
    commandId: "ctx-link",
    url: "https://docs.example/path",
    title: "Docs",
    tabId: null,
  });
  assert.equal(result.result.item.kind, "link");
  assert.equal(result.result.item.url, "https://docs.example/path");
  const again = await service(
    browser,
    repository,
    entities,
  ).captureContextTarget({
    commandId: "ctx-link-dup",
    url: "https://docs.example/path",
    title: "Docs",
  });
  assert.equal(again.skippedDuplicate, true);
});

test("captureContextTarget rejects non-http URLs", async () => {
  const browser = new FakeBrowser(tabs);
  const repository = new FakeRepository();
  await assert.rejects(
    () =>
      service(browser, repository, memoryRepository()).captureContextTarget({
        commandId: "ctx-bad",
        url: "chrome://settings",
        title: "Settings",
      }),
    /http\(s\)/,
  );
});
