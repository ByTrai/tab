# Extension organize & restore (Phase 1)

## 1. Summary of changes

- Expanded `ChromiumBrowserAdapter` with `capabilities()`, partial-failure-safe `closeTabs()`, and `openTab()` that re-validates via `normalizeHttpUrl` before create.
- Updated `CaptureService` for partial close reporting (`failedCloseIds`, stage stays `closing` until every intended tab closes), URL revalidation on undo, `recoverInterrupted()` for `closing`/`undoing` ops, and `restoreItems()` with partial-failure results.
- After capture commit, syncs link items into `@tabby/local-store` under default workspace **Saved tabs** / group **Inbox** using `applyCommand`.
- Wired `background.js` with `EntityRepository` + capture journal, startup recovery, and messages: `workspaceState`, `applyWorkspaceCommand`, `restore`, `recover` (existing inventory/capture/undo/state kept).
- Upgraded new-tab UI with organize panel (workspaces/groups/items, search, restore, trash, new workspace/group), teal/ink tokens, local font stacks (Source Serif 4/Georgia + IBM Plex Sans/system-ui), focus styles, and safe-link rendering.
- Switched `@tabby/local-store` to a relative contracts import so the build-free MV3 worker can load it without a bundler.
- Permissions unchanged: `tabs` only; no host permissions or content scripts.

## 2. Testing & validation

- `node --test apps/extension/test/*.test.js` — **30 passed** (prior 22 plus recover/restore/URL-block/entity-sync coverage).
- New cases cover: partial close, `recoverInterrupted` for gone tabs and resumed undo, restore partial open failure, `javascript:` / credential URL blocking, undo skip of unsafe URLs, and Saved tabs/Inbox sync.
- Manifest privilege baseline still expects only `tabs`.

## 3. Recommendations for next steps

1. Load `apps/extension` unpacked and exercise capture → Inbox sync → restore selected → trash → worker restart recovery.
2. Add IndexedDB-backed Playwright coverage for organize panel and interrupted close/undo.
3. Persist workspace command log alongside entities; avoid `replaceFromExport` for reorder when trash must be preserved.
4. Replace `window.prompt` for new workspace/group with accessible in-page dialogs before store review.
5. Keep Plasmo / extra permissions deferred until Phase 1 organize flows are stable on the build-free shell.
