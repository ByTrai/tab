# Manifest V3 Safe Capture Handoff

## 1. Summary of changes

- Added a loadable, dependency-free Manifest V3 Chromium extension with a new-tab dashboard, current-window inventory, selection, local capture history, save, save-and-close, and undo.
- Added a browser API abstraction and framework-independent capture service. Only normalized HTTP(S) tabs are capturable; unsupported URLs remain visible with a reason.
- Added an idempotent operation journal. Items and the initial operation commit in one IndexedDB transaction before browser mutation; closure intent is persisted before removal, pinned tabs are excluded, and undo survives service reconstruction.
- Added normalized duplicate detection that ignores fragments, skips duplicates by default, and reports them to the UI.
- Added fake-browser/repository tests covering restricted URLs, persistence-before-close, injected storage failure, pinned handling, idempotent replay, duplicates, and restart-safe undo, plus a Playwright loaded-extension E2E scenario.
- Product-reviewed the prior web alpha and documented severity-ranked findings rather than silently carrying misleading or unsafe affordances forward.
- Updated the README, threat model, and ADRs. Files affected are under `apps/extension`, plus `package.json`, `README.md`, `docs/adr/0002-manifest-v3-safe-capture.md`, `docs/product-review/local-web-alpha.md`, and `docs/threat-model/local-alpha.md`.

## 2. Testing & validation

- `npm run test:extension` passes five Node test cases without third-party test dependencies.
- `git diff --check` passes.
- The Playwright scenario was authored but could not run because Playwright/Chromium are not installed in this environment and registry access is blocked.
- Security review confirmed a single `tabs` permission, no host access/content scripts/remote code, scheme allowlisting, DOM text rendering, referrer-safe links, transaction-first closure, and default preservation of pinned tabs.
- Captures currently rewrite a bounded whole-state record. This is appropriate for alpha correctness but needs normalized IndexedDB stores and performance fixtures before the 10,000-item gate.

## 3. Recommendations for next steps

1. Load `apps/extension` into Chrome and review permission copy, inventory states, selection defaults, Save & close, worker restart, and undo with pinned/audible/discarded tabs.
2. Install Playwright with its Chromium runtime and run the loaded-extension E2E suite; expand it with quota injection and worker termination at every journal transition.
3. Add extension-native workspaces/groups and reuse or package the existing domain schema rather than maintaining separate web/extension item shapes.
4. Replace whole-state storage with indexed item and operation stores, add migrations, retention/compaction, quota UX, export integration, and 1k/10k performance fixtures.
5. Resolve web-alpha product review findings: remove `window.prompt`, implement or remove misleading drag/menu controls, provide edit/move/trash, and improve narrow-screen workspace discovery.
6. Keep synchronization, sharing, E2EE, telemetry, content scripts, and broader permissions deferred.

## 4. Prompt for next task

```text
Continue Tabby in /workspace/tab. Read roadmap.md, README.md, docs/adr/0001-local-first-web-alpha.md, docs/adr/0002-manifest-v3-safe-capture.md, docs/threat-model/local-alpha.md, and changelog/manifest-v3-safe-capture.md. First manually load and product-review apps/extension. Then unify the web and extension domain/export contracts in a buildable shared package, normalize extension IndexedDB into versioned item and operation stores, and add migrations, quota handling, retention/compaction, and JSON backup compatibility. Install and run Playwright's Chromium extension E2E tests, including service-worker termination before/after each journal transition and injected storage/removal/restore failures. Fix the web alpha's prompt-based dialogs and nonfunctional drag/menu affordances. Do not add sync, host permissions, content scripts, or telemetry. Update ADR/threat-model docs and create the mandatory changelog handoff.
```
