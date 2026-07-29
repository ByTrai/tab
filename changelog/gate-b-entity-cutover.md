# Gate B — web entity cutover, import dry-run, E2E baseline

## 1. Summary of changes

Completed the private-alpha critical path that was still open after the prior senior-review pass:

- **T2.1:** Web `/app` now persists through `@tabby/local-store` `EntityRepository` (`tabby-entities`) instead of the flat `tabby-workspace` document. Legacy aggregates migrate once; a pre-migration JSON backup is auto-downloaded.
- **T2.2:** Added `previewWorkspaceImport` dry-run (creates/updates/removes, fail-closed validation), 30-day soft-trash purge on load, and atomic import that clears trash via `replaceFromExport` + `clearTrash`.
- **T4.3:** Extension new-tab notes with autosave hint, task toggle, search across notes, export + dry-run import (context-menu/popup/side-panel still deferred).
- **T9.2 (partial):** Playwright extension E2E (capture + recover) green under xvfb using Playwright Chromium; `npm run bench:local-store` records 1k-item timings.
- **T7.3 (partial):** `docs/user-guide/backup-and-recovery.md` added.
- **T0.1 / T5.1 / T6.1:** Roadmap statuses synced; DCO documented in CONTRIBUTING (no CLA); design-system card marked done.
- **Explicitly not started:** T8 sync, Plasmo T4.1, permission expansion.

### Touch set

- `apps/extension/packages/local-store/**` — trash purge/clear/meta, trash↔bundle helpers, legacy trash migration
- `apps/extension/packages/workspace-contracts/**` — `previewWorkspaceImport`
- `apps/extension/newtab.{html,css,js}`, `background.js` — notes/import/export + `putWorkspaceItem`
- `src/lib/workspace-store.ts` — EntityRepository cutover + `applyWorkspaceCommand`
- `src/app/_components/workspace-app.tsx` — command persistence + dry-run import + migration backup UX
- `apps/extension/test/**`, `apps/extension/e2e/**`, `playwright.config.js`
- `.github/workflows/quality.yml`, `scripts/bench-local-store.mjs`, `package.json`
- `docs/user-guide/backup-and-recovery.md`, `roadmap.md`, `CONTRIBUTING.md`, `README.md`

## 2. Testing & validation

- `npm run test:extension` — 34 passing
- `xvfb-run -a npm run test:e2e:extension` — 2 passing (Playwright Chromium)
- `SKIP_ENV_VALIDATION=1 npm run typecheck`
- `npm run lint` / `format:check`
- `SKIP_ENV_VALIDATION=1 npm run build`
- `npm run bench:local-store` — 1k items well under 100 ms local targets (memory repo)

## 3. Recommendations for next steps

1. Finish T9.2: worker-termination checkpoints at every journal stage; 10k/50k benches on reference hardware.
2. T4.3 follow-up: context-menu / popup / side-panel as thin command consumers; optional permissions only at invoke time.
3. Finish T7.3 contributor 15-minute setup drills + architecture diagrams.
4. T5.2 accessibility audit.
5. Keep T4.1 Plasmo and T8 sync deferred until Gate B/C evidence.

## 4. Prompt for next task

```text
Continue Tabby Gate B hardening. Expand T9.2 with worker-termination journal-stage E2E checkpoints and 10k/50k local-store benches recorded (not asserted as CI gates). Then add thin extension popup capture as a command consumer — do not start Plasmo (T4.1) or sync (T8), and do not add permissions beyond tabs.
```
