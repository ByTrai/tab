import assert from "node:assert/strict";
import test from "node:test";
import { CaptureService, classifyTab } from "../core.js";
import { FakeBrowser, FakeRepository } from "./fakes.js";

const tabs = [
  { id: 1, index: 0, title: "Example", url: "https://example.com/a#section", pinned: false },
  { id: 2, index: 1, title: "Pinned", url: "https://pinned.example/", pinned: true },
  { id: 3, index: 2, title: "Settings", url: "chrome://settings", pinned: false },
];

function service(browser, repository) {
  let id = 0;
  return new CaptureService({ browser, repository, now: () => "2026-07-26T00:00:00.000Z", createId: () => `item-${++id}` });
}

test("classifies restricted and invalid URLs without throwing", () => {
  assert.equal(classifyTab(tabs[0]).capturable, true);
  assert.deepEqual(classifyTab(tabs[2]), { capturable: false, reason: "Browser and local pages cannot be captured." });
  assert.equal(classifyTab({ id: 4, url: "javascript:alert(1)" }).capturable, false);
  assert.equal(classifyTab({ id: 5 }).capturable, false);
});

test("persists before closing and never closes pinned tabs", async () => {
  const browser = new FakeBrowser(tabs);
  const repository = new FakeRepository();
  const result = await service(browser, repository).capture({ commandId: "command-1", tabIds: [1, 2], close: true });
  assert.deepEqual(browser.closed, [1]);
  assert.equal(repository.items.length, 2);
  assert.equal(result.stage, "closed");
  assert.deepEqual(result.closedTabIds, [1]);
});

test("storage failure closes no tabs", async () => {
  const browser = new FakeBrowser(tabs);
  const repository = new FakeRepository({ failCommit: true });
  await assert.rejects(service(browser, repository).capture({ commandId: "command-2", tabIds: [1], close: true }), /Injected storage failure/);
  assert.deepEqual(browser.closed, []);
  assert.equal(repository.items.length, 0);
});

test("replayed command is idempotent and normalized duplicates are skipped", async () => {
  const browser = new FakeBrowser(tabs);
  const repository = new FakeRepository();
  const capture = service(browser, repository);
  await capture.capture({ commandId: "same-command", tabIds: [1], close: false });
  await capture.capture({ commandId: "same-command", tabIds: [1], close: false });
  const duplicate = await capture.capture({ commandId: "different-command", tabIds: [1], close: false });
  assert.equal(repository.items.length, 1);
  assert.deepEqual(duplicate.duplicateTabIds, [1]);
});

test("undo survives service reconstruction and restores only closed tabs", async () => {
  const browser = new FakeBrowser(tabs);
  const repository = new FakeRepository();
  await service(browser, repository).capture({ commandId: "restart-command", tabIds: [1, 2], close: true });
  const restartedService = service(browser, repository);
  const result = await restartedService.undo("restart-command");
  assert.equal(result.stage, "undone");
  assert.deepEqual(browser.opened.map(({ url }) => url), ["https://example.com/a#section"]);
  assert.equal(repository.items.length, 0);
  await restartedService.undo("restart-command");
  assert.equal(browser.opened.length, 1);
});
