# AGENTS.md

## Cursor Cloud specific instructions

Tabby has three independently runnable surfaces. The update script only runs `npm install`; everything below is how to run/verify each surface.

### Services / surfaces

- Web workspace (primary): Next.js App Router. Landing page at `/`, workspace app at `/app`. Local-first — persists to browser IndexedDB, needs no Postgres or OAuth.
- Chromium extension: build-free MV3 extension in `apps/extension/`. Loaded unpacked via `chrome://extensions` (Developer mode → Load unpacked → select `apps/extension`). No build step; reload from the extensions page after edits.
- Server/auth/DB (optional): tRPC + Better Auth + Drizzle/Postgres under `src/server/`. Only needed for auth/sync work. Requires Postgres (`./start-database.sh` needs Docker/Podman) and real `BETTER_AUTH_*` / GitHub OAuth values.

### Running the dev server (non-obvious)

- `.env` is required; copy from `.env.example`. It ships with empty `BETTER_AUTH_GITHUB_CLIENT_ID/SECRET`, which `src/env.js` treats as missing and rejects.
- Because of that, run local UI work with `SKIP_ENV_VALIDATION=1 npm run dev`. Plain `npm run dev` fails env validation until real server/auth secrets are provided. Do NOT use `SKIP_ENV_VALIDATION` for actual hosted/auth work.
- The build (`SKIP_ENV_VALIDATION=1 npm run build`) prints non-fatal `BetterAuthError: You are using the default secret` lines during static generation; the build still succeeds (exit 0). Provide a real `BETTER_AUTH_SECRET` to silence it.

### Lint / test / build / run commands

Standard commands live in `package.json` and `README.md`. Key ones:

- Full gate: `npm run check` (format + lint + typecheck + extension tests + roadmap test + manifest + license checks).
- Extension unit/contract tests: `npm run test:extension` (Node built-in test runner, no browser needed).
- Build: `SKIP_ENV_VALIDATION=1 npm run build`.
- Dev: `SKIP_ENV_VALIDATION=1 npm run dev` (http://localhost:3000).

### Package manager

The repo is npm-locked (`package-lock.json`, `packageManager: npm@10.9.3`, npm `overrides`, npm `workspaces`). Use npm, not pnpm/yarn — the `overrides` block and workspace resolution are npm-specific.
