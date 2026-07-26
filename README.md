# Tabby

Tabby is an open-source, local-first workspace for links, notes, and lightweight tasks. The current release is a functional web alpha: it works without an account, stores data in IndexedDB, searches instantly, supports multiple workspaces and groups, and imports/exports a versioned JSON backup.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`. Database and OAuth configuration are not required for the local workspace.

## Load the Chromium extension

1. Open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select `apps/extension`.
3. Open a new tab. Tabby shows the current window inventory; ordinary HTTP(S) tabs are selected by default while pinned and restricted tabs remain unselected.

The extension is dependency-free and does not need a build command. It requests only the `tabs` permission, stores captures and its restart-safe operation journal in extension IndexedDB, and has no content scripts or host permissions.

## Quality checks

```bash
npm run format:check
npm run typecheck
npm run build
npm run test:extension
```

## Architecture

- `src/app/_components/workspace-app.tsx` — accessible client experience and application commands.
- `src/lib/workspace.ts` — framework-independent schema, validation, URL safety, search, and starter data.
- `src/lib/workspace-store.ts` — transactional IndexedDB persistence boundary.
- `apps/extension` — unpacked Manifest V3 extension, browser adapter, capture service, IndexedDB journal, and tests.
- `docs/adr` — architectural decisions and deferred work.
- `docs/threat-model` — privacy and security boundaries.

The web alpha intentionally has no synchronization, telemetry, third-party favicon fetches, or broad browser permissions. Export a JSON backup before clearing browser storage. A Manifest V3 extension and safe browser-tab capture remain the next risk-first milestone.

## Product assumptions

In lieu of discovery interviews, Phase 0 proceeds with documented assumptions: tab-heavy users value safe capture/resume most; local-only use must be complete without signup; links, notes, and tasks may share a lightweight workspace; and data portability is mandatory. These assumptions need validation in product review and must not be represented as research findings.

## Contributing and security

Please keep domain behavior outside React where possible, validate all imported data, and do not add analytics or browser permissions without an ADR and privacy review. Report security issues privately to maintainers rather than opening a public exploit report. The project license and final public security contact still require owner/legal confirmation before a production release.
