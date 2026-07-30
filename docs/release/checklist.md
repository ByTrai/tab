# Production and open-source release checklist (T9.3)

**Status:** scaffolding complete for private-alpha → public beta prep  
**Not done here:** Chrome Web Store submission, paid signing infra, or claiming store availability on the landing page.

## Artifacts to produce per release

| Artifact                        | Command / location                                                   |
| ------------------------------- | -------------------------------------------------------------------- |
| Extension zip (baseline)        | `npm run release:extension` → `artifacts/tabby-extension-vX.Y.Z.zip` |
| SBOM (CycloneDX JSON)           | `npm run release:sbom` → `artifacts/sbom.json`                       |
| Permission / privacy disclosure | `docs/release/store-privacy.md`                                      |
| Compatibility matrix            | `docs/release/compatibility.md`                                      |
| Rollback notes                  | this file, § Rollback                                                |

## Pre-release gates

1. `npm run check` green (format, lint, typecheck, extension tests, manifest, licenses, a11y smoke)
2. `npm run audit:dependencies` green for production policy
3. `xvfb-run -a npm run test:e2e:extension` green
4. `npm run check:plasmo-manifest` green (parallel shell privilege budget)
5. No critical findings in `docs/accessibility/private-alpha-audit.md` / security review
6. Landing claims match shipped capability (`docs/product-review/landing-ia.md`)

## Rollback

1. **Web:** redeploy previous Next.js build; users keep IndexedDB; export schema remains v1/v2 compatible.
2. **Extension:** redistribute previous `apps/extension` zip; IndexedDB names `tabby-extension` / `tabby-entities` must not change without a tested migration.
3. **Plasmo shell:** never the sole distributed build until cutover ADR amendment; baseline remains authoritative.

## Explicitly out of scope until later

- Hosted sync (T8) and E2EE claims
- Firefox store listing
- Docker self-host production guarantees
- Collaborative editing
