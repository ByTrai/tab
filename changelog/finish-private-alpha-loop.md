# Private-alpha loop — Plasmo spike, context menus, release scaffolding

## 1. Summary of changes

Closes the remaining local engineering cards that were parked or scaffold-only:

- **T0.2:** Clean-room workflow inventory, activation/reliability measures, interview script, and explicit feature rejects (`docs/product-review/clean-room-and-discovery.md`).
- **T4.1:** Parallel `apps/extension-plasmo` shell pinned to `plasmo@0.90.5` with popup / new-tab / background entries, privilege checker, and root `build:plasmo` / `check:plasmo-manifest`. Production baseline remains `apps/extension`.
- **T4.3:** Optional `contextMenus` permission + “Capture with Tabby” menu; popup enable affordance; `CaptureService.captureContextTarget` (page tab → journal capture, bare URL → inbox link, never auto-close).
- **T9.3:** Release checklist, store privacy disclosure, compatibility matrix, `release:extension` zip, minimal CycloneDX SBOM script.

### Touch set

- `apps/extension/{core,background,manifest,popup.*}` + context-menu tests
- `apps/extension-plasmo/**`
- `scripts/{check-*-manifest,release-*}.mjs`
- `docs/{product-review,release}/**`, `roadmap.md`, CI quality workflow

## 2. Testing & validation

- `npm run test:extension` — includes `captureContextTarget` cases
- `npm run check:manifest` / `check:plasmo-manifest` — `tabs` required; `contextMenus` optional only
- `npm run install:plasmo && npm run build:plasmo` — Plasmo packages without host permissions
- `npm run release:sbom` / `release:extension` — artifacts under `/artifacts` (gitignored)
- `npm run check` — format, lint, typecheck, tests, licenses, a11y

## 3. Recommendations for next steps

1. Run consenting user interviews from the T0.2 script; attach notes without raw URLs.
2. Wire CaptureService + IndexedDB into the Plasmo SW only after package-size/parity matrix.
3. Commission security/a11y review and start the 30-day observation clock before claiming Gate C.
4. **Do not start T8 sync.**

## 4. Prompt for next task

```text
Keep Tabby on local-only Gate B/C prep. Run Plasmo CaptureService parity only if package diffs are clean; otherwise start private-alpha observation and interview fieldwork from docs/product-review/clean-room-and-discovery.md. Do not implement hosted sync (T8).
```
