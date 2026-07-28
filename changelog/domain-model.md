# Canonical Domain Model Handoff

## 1. Summary of changes

- Added portable workspace export schema v2 contracts for ordered workspaces, groups, discriminated link/note/task items, recovery records, and tombstones.
- Added deterministic web schema v1 migration and serialization with collection bounds, globally unique client IDs, referential integrity, field limits, HTTP(S)-only URLs, and canonical UTC timestamps.
- Added fractional numeric ordering with explicit precision-exhaustion handling rather than hidden reorder corruption.
- Hardened extension journal v1/v2 migration with item/operation bounds and UTC timestamp checks while preserving recovery metadata.
- Added web v1 and extension journal v1/v2 JSON fixtures plus migration, determinism, malicious-input, unknown-version, ordering, and immutability tests.
- Added ADR 0005 and updated T1.1 to in-progress; completion remains gated on dependency-backed quality checks because registry access is still denied.
- Corrected CI setup so it no longer requests npm caching before a lockfile exists.
- Files affected: `.github/workflows/quality.yml`, `apps/extension/packages/workspace-contracts/index.js`, `apps/extension/packages/workspace-contracts/index.d.ts`, `apps/extension/test/domain-contracts.test.js`, `apps/extension/test/fixtures/*`, `docs/adr/0005-canonical-workspace-export.md`, `roadmap.md`, and this handoff.

## 2. Testing & validation

- `node --test apps/extension/test/*.test.js` passed all 12 tests, including existing capture/recovery behavior and new contract fixtures.
- `node --check apps/extension/packages/workspace-contracts/index.js` passed.
- `git diff --check` passed.
- `npm install` still failed because the environment registry proxy returned HTTP 403 for `@auth/drizzle-adapter`; consequently no trustworthy lockfile could be generated and Better Auth/Drizzle type compatibility, full lint/typecheck, audit, license scan, and Next.js build remain unverified.
- Security checks cover unsafe schemes, credential-bearing URL rejection through shared normalization, oversized collections, duplicate IDs, orphan references, unexpected versions, and non-canonical timestamps. No browser permission or runtime UI code changed.
- Migration is O(workspaces + groups + items) time and memory using sets for reference/duplicate checks. It validates collection sizes before allocation; deterministic serialization intentionally materializes one canonical copy.

## 3. Recommendations for next steps

1. Run `npm install` in a registry-enabled environment, commit `package-lock.json`, and execute the complete T9.1 command set before marking T1.1 done.
2. Verify or replace the Better Auth 1.3.0 pin based on actual peer metadata; do not suppress peer conflicts with `--legacy-peer-deps`.
3. Integrate `migrateWorkspaceExport` at web import/export boundaries under T2.2; do not rewrite existing IndexedDB data without backup and rollback tests.
4. Define deterministic rebalancing and idempotent command semantics in T1.2 before enabling frequent reorder operations.
5. Add recovery-record and tombstone lifecycle/retention rules when repository interfaces are implemented.

## 4. Prompt for next task

```text
Continue Tabby in /workspace/tab. Read roadmap.md, changelog/domain-model.md, docs/adr/0004-shared-workspace-contracts.md, docs/adr/0005-canonical-workspace-export.md, and all AGENTS.md files. First use registry-enabled npm access to run npm install and commit package-lock.json; verify Better Auth 1.3.0 with the current Drizzle versions, then run npm run check, npm run audit:dependencies, and SKIP_ENV_VALIDATION=1 npm run build. Fix issues without legacy peer-dependency overrides or weakened manifest/license policies. Once green, mark T1.1 done and implement T1.2 command/repository interfaces: idempotent create/rename/move/archive/trash/capture/restore/import/export/undo commands, deterministic reorder rebalance, typed validation/quota/corruption/permission/partial-failure errors, and property/invariant tests. Do not add UI, IndexedDB implementation, browser permissions, sync, or framework dependencies. Create changelog/command-repository-interfaces.md, commit, and open a focused pull request.
```
