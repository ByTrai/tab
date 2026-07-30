# Docs and accessibility for private alpha

## 1. Summary of changes

Continues Gate B polish after recovery/popup work:

- **T7.3:** Architecture overview (mermaid, stable boundaries), contributor ≤15-minute setup drill, README/CONTRIBUTING links.
- **T7.1:** Landing IA/copy claim rules documented from the shipped `/` page.
- **T5.2:** Private-alpha a11y audit report; `npm run check:a11y` smoke suite; targeted fixes (focus-visible, settings `aria-expanded`, Escape on dialogs/popover, kind `aria-pressed`, popup heading).

Plasmo (T4.1) and sync (T8) remain deferred.

### Touch set

- `docs/architecture/overview.md`, `docs/contributor-setup.md`, `docs/product-review/landing-ia.md`, `docs/accessibility/private-alpha-audit.md`
- `scripts/check-a11y-smoke.mjs`, `package.json`, `.github/workflows/quality.yml`
- `src/app/_components/workspace-app.tsx`, `src/styles/globals.css`
- `apps/extension/popup.html`, `popup.css`
- `README.md`, `CONTRIBUTING.md`, `roadmap.md`

## 2. Testing & validation

- `npm run check:a11y`
- `npm run test:extension`
- `SKIP_ENV_VALIDATION=1 npm run typecheck`
- `npm run lint` / `format:check`

## 3. Recommendations for next steps

1. Keep T4.1 Plasmo parked until private-alpha feedback, or start only after official Plasmo verification.
2. Optional: Lighthouse CI on landing; full NVDA/VoiceOver scripted pass.
3. T0.2 user discovery interviews when ready for Gate C evidence.
4. Do not start T8 sync.

## 4. Prompt for next task

```text
Either start staged Plasmo parallel shell (T4.1) after verifying current official Plasmo docs and pinning a reviewed version, or run T0.2 user discovery documentation. Do not start sync (T8) or broaden extension permissions beyond tabs.
```
