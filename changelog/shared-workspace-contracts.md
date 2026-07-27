# Shared workspace contracts handoff

## 1. Summary of changes

- Added the private, framework-independent `@tabby/workspace-contracts` package at `apps/extension/packages/workspace-contracts`. It defines shared workspace/group/item interfaces, item kinds, limits, schema versions, safe HTTP(S) normalization, duplicate URL keys, and the pure extension capture migration.
- Kept the package under the extension root so Manifest V3 can import it directly without a bundler. The Next.js Zod domain adapter now consumes the same constants and URL normalizer.
- Advanced only the extension capture journal from schema version 1 to 2. Existing IndexedDB database, object store, and key names are unchanged. Legacy items gain `kind` and `createdAt` in memory while all recovery and unknown fields are preserved; the next mutation writes version 2 atomically.
- Changed incompatible/unknown extension state from silent deletion to an explicit failure. New capture records contain both the legacy `capturedAt` field and the shared `createdAt`/`kind` fields during the compatibility window.
- Added compatibility coverage for URL edge cases, empty/current state, v1 migration, metadata preservation, immutability, and unknown-version rejection. Updated ADR 0002, added ADR 0004, and expanded the local threat model.

Files affected: `package.json`, `src/lib/workspace.ts`, `apps/extension/core.js`, `apps/extension/repository.js`, `apps/extension/packages/workspace-contracts/*`, `apps/extension/test/contracts.test.js`, `docs/adr/0002-manifest-v3-safe-capture.md`, `docs/adr/0004-shared-workspace-contracts.md`, and `docs/threat-model/local-alpha.md`.

## 2. Testing and validation

- `node --test apps/extension/test/*.test.js` passes all extension and new contract tests.
- Dependency installation was attempted with both normal and legacy peer resolution. Normal resolution exposed the existing `better-auth`/`drizzle-kit` peer mismatch; the fallback was blocked by the environment's registry policy for `@opentelemetry/semantic-conventions`. As a result, formatting, TypeScript, and Next.js build checks must be rerun in an environment with the repository dependencies available.
- Security review covered dangerous schemes, non-string coercion, embedded URL credentials, fragment-based duplicate bypasses, unknown schema downgrade/data-loss behavior, and preservation of the persist-before-close boundary. No SQL/server/auth path was connected to local data.
- Migration is linear in saved items plus journal entries and allocates a new snapshot. This matches the existing whole-state transaction cost and does not introduce additional IndexedDB round trips.

## 3. Recommendations for next steps

1. Resolve and lock the Better Auth/Drizzle peer versions, commit a reproducible lockfile, then run Prettier, TypeScript, Next.js production build, and the extension tests in CI.
2. Add a browser-driven IndexedDB fixture test that seeds journal v1, restarts the service worker, performs a mutation, and verifies the on-disk v2 snapshot plus undo behavior.
3. Introduce bounded runtime validation and a user-visible quarantine/export path for malformed local records; never replace unsupported state with an empty state.
4. Revalidate historical URLs immediately before navigation. Consider an explicit policy for loopback/private-network URLs if future features fetch metadata rather than merely navigating.
5. When a bundler is adopted for the extension, move the package to a conventional root `packages/` directory and add conditional package exports rather than maintaining a copied artifact.

## 4. Prompt for next task

> Continue Tabby's local-first architecture in `/workspace/tab` from `changelog/shared-workspace-contracts.md`. The dependency-free shared package is at `apps/extension/packages/workspace-contracts`, the Next.js Zod adapter consumes its limits and safe URL normalizer from `src/lib/workspace.ts`, and the extension repository migrates capture journal v1 to v2 without changing IndexedDB keys. Resolve the `better-auth`/`drizzle-kit` dependency and lockfile mismatch, run formatting/typecheck/production build/extension tests, then add a real IndexedDB compatibility fixture (including service-worker reconstruction and persistence of the migrated v2 journal). Preserve legacy recovery fields, fail closed on unknown versions, keep the extension loadable unpacked without remote code, update ADR/threat-model documentation, and create the mandatory changelog handoff.
