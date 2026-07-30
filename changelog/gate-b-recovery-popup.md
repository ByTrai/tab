# Gate B — recovery matrix, popup capture, multi-size benches

## 1. Summary of changes

Continues after the entity-store cutover (PR #13). Closes the remaining local private-alpha quality gap without Plasmo or sync:

- **T9.2:** Journal-stage recovery matrix unit tests; resume `saved`+`closeRequested` after worker restart; Playwright E2E for popup capture and seeded `closing` recover; 1k/10k/50k local-store bench artifact uploaded from CI (record-only).
- **T4.3 follow-up:** Thin `action.default_popup` capture UI (`popup.html` / `popup.js`) that reuses the same `inventory` / `capture` / `undo` messages — still `tabs` only.
- Roadmap current assignment advanced past T9.2; T4.1 Plasmo remains deferred.

### Touch set

- `apps/extension/core.js` — `resumeCloseAfterSaved` in `recoverInterrupted`
- `apps/extension/test/fakes.js`, `recovery-matrix.test.js`
- `apps/extension/popup.{html,css,js}`, `manifest.json`
- `apps/extension/e2e/popup.spec.js`
- `scripts/bench-local-store.mjs`, `.github/workflows/quality.yml`, `.gitignore`
- `roadmap.md`, this changelog

## 2. Testing & validation

- `npm run test:extension` — recovery matrix + prior suites
- `xvfb-run -a npm run test:e2e:extension` — newtab + popup + seeded closing recover
- `npm run check:manifest` — permissions remain `["tabs"]`
- `npm run bench:local-store` — writes `artifacts/bench-local-store.json`

## 3. Recommendations for next steps

1. Park T4.1 Plasmo until private-alpha feedback, or start staged shell only after reviewing current official Plasmo facts.
2. Finish T7.3 contributor setup drills + architecture diagrams.
3. T5.2 accessibility audit across landing, `/app`, new-tab, and popup.
4. Optional: context-menu capture as another thin command consumer (may need optional permission at invoke time — ADR first).
5. Do not start T8 sync.

## 4. Prompt for next task

```text
Finish Tabby docs and a11y for private alpha. Complete T7.3 contributor 15-minute setup verification and architecture diagrams from stable boundaries, then run T5.2 keyboard/screen-reader/zoom audit on landing, /app, new-tab, and popup. Keep T4.1 Plasmo and T8 sync deferred; do not add permissions beyond tabs.
```
