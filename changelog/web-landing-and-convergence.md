# Web landing and command convergence

## Summary

Ships Phase 1/2 web surfaces: marketing landing at `/`, workspace app at `/app`, soft-delete + export schema v2 via `applyCommand`, Better Auth hardening, and community security/templates.

## Changes

- Added original Tabby landing (save/close/resume, local-first privacy; honest feature claims).
- Moved the IndexedDB workspace UI to `/app` with shared teal/ink/sand tokens.
- Converged create/rename/trash/restore/toggle/createItem/import onto `@tabby/workspace-contracts` `applyCommand`.
- Persist ordered entities + trash; migrate legacy v1 docs on load; export with `serializeWorkspaceExport`.
- Replaced `window.prompt`/`confirm` with dialogs; removed fake ⌘K/avatar/drag/menu affordances; theme + destination group in `localStorage`.
- Better Auth: GitHub OAuth only, `BETTER_AUTH_URL` / `baseURL`, `trustedOrigins`, cookie cache disabled.
- Added `SECURITY.md`, bug/feature issue templates, and PR template.

## Validation

- `SKIP_ENV_VALIDATION=1 npm run typecheck` (tsconfig excludes `apps/extension`; extension remains covered by `npm run test:extension`)
- Prefer extension contract tests remain green
