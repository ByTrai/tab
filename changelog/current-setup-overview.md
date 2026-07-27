# Current setup overview

## 1. SUMMARY OF CHANGES

- Documented the current repository setup for handoff and review; no runtime behavior was changed.
- Confirmed that the product currently has two independent local-first clients:
  - a Next.js web workspace that stores one validated workspace aggregate in browser IndexedDB; and
  - a dependency-free Manifest V3 Chromium extension with its own IndexedDB database and restart-aware capture operation journal.
- Recorded that the existing PostgreSQL, Better Auth, and tRPC code is scaffolded for a future hosted control plane but is not part of the current local workspace data path.
- Key architectural decision: treat the web application and extension as separate alpha implementations today. They do not share storage, domain packages, or synchronization, despite the longer-term monorepo direction described in the roadmap.
- Files reviewed: `README.md`, `package.json`, `.env.example`, `src/app`, `src/lib`, `src/server`, `apps/extension`, `docs/adr`, `docs/threat-model`, and `roadmap.md`.
- File added: `changelog/current-setup-overview.md`.

## 2. TESTING & VALIDATION

- Ran Prettier validation for supported source and documentation files.
- Ran the TypeScript compiler without emitting output.
- Ran the Node test suite for the extension capture service.
- Ran a production Next.js build with environment validation skipped because the local-first UI does not need PostgreSQL or OAuth configuration.
- Security review: confirmed HTTP(S)-only URL acceptance, schema and import size limits in the web client, React text rendering, `noreferrer` on external links, minimal extension permissions, restricted-protocol filtering, and persistence-before-close ordering.
- Security caveats: local IndexedDB and exported backups are unencrypted; extension repository state is structurally trusted after reading; and production auth configuration still contains a localhost-only GitHub callback.
- Performance review: both clients currently rewrite/read whole aggregate state. This is simple and transactionally clear for an alpha, but search performs repeated linear relationship lookups and storage will not meet the roadmap's 10,000-item target without indexed entity stores and precomputed lookup maps or an index.

## 3. RECOMMENDATIONS FOR NEXT STEPS

1. Consolidate shared schemas, URL normalization, IDs, and IndexedDB repository contracts into framework-independent packages so the web and extension cannot drift.
2. Define the integration boundary between captured extension tabs and web workspaces; today they use separate databases (`tabby-extension` and `tabby-workspace`) and captured tabs do not appear in the web UI.
3. Replace the scaffold `post` API and mismatched database naming conventions before implementing sync; `drizzle.config.ts` filters `tab_*` while the application table creator currently prefixes tables with `pg-drizzle_`.
4. Make the OAuth base URL/callback environment-driven before deployment, require a strong auth secret in every non-test hosted environment, and document production secret rotation.
5. Add web-domain and IndexedDB tests for schema relations, failed transactions, malformed imports, quota failures, and concurrent writes. Add Playwright coverage for the extension's real-browser close/undo and worker-restart paths.
6. Introduce explicit IndexedDB migrations, corruption recovery, and backup/restore UX before changing the persisted schema.
7. Address current UX gaps called out by the roadmap: rename/move/reorder/archive/recover actions, keyboard shortcuts, system-theme persistence, and accessible alternatives to drag interactions.

## 4. PROMPT FOR NEXT TASK

> Continue the Tabby local-first architecture work in `/workspace/tab`. The current repository contains a Next.js web workspace (`src/app/_components/workspace-app.tsx`) backed by a Zod domain schema (`src/lib/workspace.ts`) and aggregate IndexedDB adapter (`src/lib/workspace-store.ts`), plus an independent Manifest V3 extension (`apps/extension`) backed by its own capture schema and IndexedDB journal. The server-side tRPC, Better Auth, and Drizzle/PostgreSQL code remains scaffolded and is not used by the local workspace. Design and implement the first shared, framework-independent domain/contracts package for workspace entities and safe URL normalization, migrate both clients incrementally without breaking persisted data, add migration/compatibility tests, update the relevant ADR and threat model, run formatting, type checks, builds, and extension tests, and add the required changelog handoff document.
