# Gate B — web entity cutover, import dry-run, E2E baseline

## 1. Summary of changes

Completed the private-alpha critical path that was still open after the prior senior-review pass:

- **T2.1:** Web `/app` now persists through `@tabby/local-store` `EntityRepository` (`tabby-entities`) instead of the flat `tabby-workspace` document. Legacy aggregates migrate once; a pre-migration JSON backup is auto-downloaded.
- **T2.2:** Added `previewWorkspaceImport` dry-run (creates/updates/removes, fail-closed validation), 30-day soft-trash purge on load, and atomic import that clears trash via `replaceFromExport` + `clearTrash`.
- **T9.2 (partial):** Playwright extension E2E (capture + recover message) wired into CI under `xvfb-run`; `npm run bench:local-store` records 1k-item timings.
- **T0.1 / T5.1 / T6.1:** Roadmap statuses synced; DCO documented in CONTRIBUTING (no CLA); design-system card marked done.
- **Explicitly not started:** T8 sync, Plasmo T4.1, permission expansion.

### Touch set

- `apps/extension/packages/local-store/**` — trash purge/clear/meta, trash↔bundle helpers, legacy trash migration
- `apps/extension/packages/workspace-contracts/**` — `previewWorkspaceImport`
- `src/lib/workspace-store.ts` — EntityRepository cutover + `applyWorkspaceCommand`
- `src/app/_components/workspace-app.tsx` — command persistence + dry-run import + migration backup UX
- `apps/extension/test/**`, `apps/extension/e2e/**`, `playwright.config.js`
- `.github/workflows/quality.yml`, `scripts/bench-local-store.mjs`, `package.json`
- `roadmap.md`, `CONTRIBUTING.md`, this changelog

## 2. Testing & validation

- `npm run test:extension` — 34 passing (purge, legacy trash migrate, preview dry-run, trash bundle round-trip)
- `SKIP_ENV_VALIDATION=1 npm run typecheck`
- `npm run lint`
- `npm run bench:local-store` — 1k items: replace ~4 ms, search ~0.4 ms (memory repo; record only)
- Playwright E2E added; CI job `extension-e2e` installs Chromium and runs under xvfb

## 3. Recommendations for next steps

1. Finish T9.2: worker-termination checkpoints at every journal stage; 10k/50k benches on reference hardware.
2. T4.3 extension notes/search/import surfaces now unblocked — keep thin command consumers.
3. T7.3 user backup/recovery docs + contributor 15-minute setup verification.
4. T5.2 accessibility audit once T4.3/T7 polish settles.
5. Keep T4.1 Plasmo and T8 sync deferred until Gate B/C evidence.

## 4. Prompt for next task

```text
Continue Tabby Gate B hardening. Expand T9.2 with worker-termination journal-stage E2E checkpoints and 10k/50k local-store benches recorded (not asserted as CI gates). Then implement T4.3 extension notes with autosave status + import preview using existing commands — do not start Plasmo (T4.1) or sync (T8), and do not add permissions beyond tabs.
```
