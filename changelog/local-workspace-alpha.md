# Local Workspace Alpha Handoff

## 1. Summary of changes

- Replaced the Create T3 starter screen with a responsive, original local-first workspace for multiple workspaces, groups, links, notes, and tasks.
- Added durable IndexedDB persistence, runtime Zod validation, safe HTTP(S)-only URL normalization, local cross-entity search, light/dark themes, JSON import/export, and starter onboarding content.
- Assumed (rather than falsely reporting) interview results: safe resume, account-free local use, lightweight mixed content, and portability are the leading needs.
- Documented the alpha architecture and local threat model; replaced the starter README with project setup, boundaries, and review guidance.
- Files affected: `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/_components/workspace-app.tsx`, `src/lib/workspace.ts`, `src/lib/workspace-store.ts`, `src/styles/globals.css`, `README.md`, `docs/adr/0001-local-first-web-alpha.md`, and `docs/threat-model/local-alpha.md`.

## 2. Testing & validation

- Attempted dependency installation, Prettier, TypeScript checking, and the production Next.js build. The environment's package registry returned HTTP 403 before dependencies could be installed, so these checks remain pending; `git diff --check` passed.
- Reviewed import size/schema boundaries, unsafe URL schemes, external-link referrer leakage, raw-HTML/XSS exposure, and data transaction failure behavior.
- The current aggregate transaction prioritizes correctness and simplicity for product review. Entity-level stores and indexes are required before claiming the roadmap's 10,000-item performance target.

## 3. Recommendations for next steps

1. Product-review the information density, terminology, onboarding, small-screen navigation, and manual add/search/backup flow.
2. Confirm the project name and license with trademark/legal review; “Tabby” is provisional.
3. Build the Manifest V3 extension and browser adapter. Implement an operation journal, current-window inventory, persistence verification, save-and-close, and restart-safe undo before closing any real tabs.
4. Add automated unit, IndexedDB integration, accessibility, Playwright extension, malicious-import, and 1k/10k performance suites.
5. Add edit/reorder/move, archive/trash/recovery, keyboard drag alternatives, bookmark import, and import dry-run/merge choices.
6. Defer account sync, sharing, E2EE claims, and self-hosting until the local no-loss workflow passes its roadmap gate.

## 4. Prompt for next task

```text
Continue Tabby in /workspace/tab. Read roadmap.md, README.md, docs/adr/0001-local-first-web-alpha.md, docs/threat-model/local-alpha.md, and changelog/local-workspace-alpha.md. Product-review the local web alpha, then create a Manifest V3 Chromium extension using a browser API abstraction. Reuse src/lib domain rules where practical. Implement current-window inventory and an idempotent operation journal so Save and close durably commits selected HTTP(S) tabs before calling browser removal; pinned tabs must remain open by default. Add restart-safe undo, duplicate handling, restricted URL states, fake-browser unit tests, IndexedDB failure injection, and Playwright extension E2E. Do not request broad host permissions or add sync. Update the ADR/threat model and create the mandatory changelog handoff.
```
