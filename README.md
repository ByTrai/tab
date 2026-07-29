# Tabby

Tabby is an open-source, local-first workspace for links, notes, and lightweight tasks. It currently includes two independently runnable clients:

- a Next.js web alpha for organizing workspaces, groups, links, and notes; and
- a dependency-free Chromium Manifest V3 extension that inventories the current window and performs restart-safe tab capture.

Both clients work locally without an account. Synchronization, collaboration, and hosted production infrastructure are intentionally deferred. See [`roadmap.md`](roadmap.md) for the remaining work, topic ownership, and delivery order. User backup steps live in [`docs/user-guide/backup-and-recovery.md`](docs/user-guide/backup-and-recovery.md).

> **Alpha warning:** browser data is stored in IndexedDB and can be lost when site or extension storage is cleared. Export a JSON backup before testing destructive browser/profile operations.

## Current capabilities

### Web workspace

- Create, rename, reorder, and delete workspaces and groups.
- Create links, notes, and lightweight tasks.
- Search the local workspace.
- Import and export versioned JSON backups.
- Persist entirely in browser IndexedDB with starter data on first launch.

### Chromium extension

- Replace the new-tab page with a current-window tab inventory.
- Select ordinary HTTP(S) tabs while excluding pinned and restricted tabs by default.
- Persist a capture operation before closing selected tabs.
- Recover incomplete operations after a Manifest V3 worker restart.
- Undo captures using a local IndexedDB journal.
- Request only the `tabs` permission; no content scripts or host permissions are used.

The web and extension share dependency-free workspace contracts, URL safety rules, and the `@tabby/local-store` indexed entity repository. Capture still uses a separate extension journal database. Sync is intentionally deferred.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or 22 (the repository uses Node 20 in `.nvmrc`).
- npm 10.9.3, as declared by the package manager policy.
- Chrome, Chromium, Brave, or Edge for extension development.
- Docker or Podman only if working on the PostgreSQL-backed server/auth code.

## Quick start: local web workspace

The local workspace route does not need PostgreSQL or OAuth.

```bash
git clone <repository-url>
cd tab
npm install
cp .env.example .env
npm run dev
```

Open <http://localhost:3000>. If you intentionally do not configure the server-side environment and environment validation blocks a command, run that command with `SKIP_ENV_VALIDATION=1`; do not use that bypass for hosted or authentication work.

```bash
SKIP_ENV_VALIDATION=1 npm run dev
```

## Load the Chromium extension

The current extension is deliberately build-free.

1. Open `chrome://extensions` (or the equivalent page in your Chromium browser).
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the repository's `apps/extension` directory.
5. Open a new tab.

After changing extension files, return to the extensions page and select **Reload** on Tabby. Reloading an extension during capture is a useful recovery test, but export important data first.

## Optional: server and database development

Server/auth work uses PostgreSQL, Drizzle, Better Auth, and GitHub OAuth. Copy `.env.example` to `.env`, replace every placeholder, then start the local database:

```bash
./start-database.sh
npm run db:push
npm run dev
```

Environment variables:

| Variable                           | Purpose                               | Required for local-only UI? |
| ---------------------------------- | ------------------------------------- | --------------------------- |
| `DATABASE_URL`                     | PostgreSQL connection used by Drizzle | No                          |
| `BETTER_AUTH_SECRET`               | Server-side session signing secret    | No                          |
| `BETTER_AUTH_GITHUB_CLIENT_ID`     | GitHub OAuth application ID           | No                          |
| `BETTER_AUTH_GITHUB_CLIENT_SECRET` | GitHub OAuth secret                   | No                          |

Never commit `.env`, real credentials, exports containing browsing data, or test fixtures derived from private user data. When adding a variable, update both `.env.example` and the validation schema in `src/env.js`.

### Database commands

```bash
npm run db:generate  # generate migrations after schema changes
npm run db:migrate   # apply committed migrations
npm run db:push      # push schema directly during local prototyping
npm run db:studio    # inspect the local database
```

Prefer committed migrations for changes intended to merge. Treat `db:push` as a local development convenience, not a deployment procedure.

## Repository structure

```text
.
├── apps/extension/                 # build-free MV3 extension
│   ├── background.js               # worker entry point and recovery wiring
│   ├── browser-adapter.js          # narrow wrapper around Chromium APIs
│   ├── core.js                     # capture/undo orchestration
│   ├── repository.js               # IndexedDB capture journal
│   ├── newtab.{html,css,js}        # current extension UI
│   ├── packages/workspace-contracts/ # shared entities, limits, URLs, migrations
│   ├── test/                       # Node unit/contract tests
│   └── e2e/                        # loaded-extension browser scenarios
├── src/
│   ├── app/                        # Next.js App Router pages and route handlers
│   │   └── _components/workspace-app.tsx # current client workspace shell
│   ├── lib/workspace.ts            # web domain helpers and legacy snapshot adapters
│   ├── lib/workspace-store.ts      # web EntityRepository adapter + legacy migration
│   ├── server/                     # tRPC, auth, and Drizzle/Postgres code
│   ├── styles/                     # global styles and Tailwind entry point
│   └── trpc/                       # React/server tRPC integration
├── docs/
│   ├── adr/                        # accepted architectural decisions
│   ├── plans/                      # focused implementation plans
│   ├── product-review/             # product assumptions and review notes
│   └── threat-model/               # security/privacy boundaries
├── changelog/                      # task handoffs required by this project
├── roadmap.md                      # topic-based, assignable remaining roadmap
└── package.json                    # root scripts and npm workspace declaration
```

### Architectural boundaries

1. Keep product invariants and transformations outside React and browser API adapters.
2. UI code calls commands; it must not directly coordinate durable writes and tab closure.
3. Persist capture state before mutating browser tabs. A UI success state is not proof of durability.
4. Keep direct `chrome.*` calls inside the browser adapter.
5. Validate imports and cross-boundary payloads. Treat URLs, titles, notes, favicons, and exports as untrusted input.
6. Do not add permissions, analytics, external favicon requests, remote extension code, or sync behavior without an ADR and privacy/security review.
7. Preserve backward compatibility with existing IndexedDB and export schema versions; add migration fixtures before changing persisted shapes.

Read the ADRs in `docs/adr` before changing these boundaries. The staged Plasmo direction is documented in `docs/adr/0003-adopt-plasmo-in-stages.md`; the current build-free extension remains the production baseline until the parity gates pass.

## Development workflow

1. Pick one unowned topic card from `roadmap.md` and add an owner such as `@tommy` or `@romeo`.
2. Confirm its dependencies are complete and declare the files/directories the task expects to touch.
3. Use a short-lived branch. Avoid mixing refactors, generated migrations, and UI features in one pull request.
4. Add risk-proportionate tests, including failure/restart cases for persistence and browser operations.
5. Run the checks below and manually exercise user-visible browser behavior.
6. Update the roadmap card and add `changelog/<feature>.md` using the required handoff sections.
7. Open a focused pull request that explains data compatibility, permissions, security/privacy, and rollback impact.

### Quality checks

```bash
npm run check            # format, lint, types, extension, manifest, and licenses
npm run audit:dependencies
SKIP_ENV_VALIDATION=1 npm run build
```

Useful focused commands:

```bash
node --test apps/extension/test/core.test.js
node --test apps/extension/test/contracts.test.js
npm run format:write
```

CI runs the same checks on pull requests and `main`, then performs a production dependency audit, a production build, and a Gitleaks history scan. The manifest policy check intentionally fails if broad host access, content scripts, or permissions beyond `tabs` appear; review and update that policy only alongside the required permission and threat-model review.

## Testing expectations

- **Domain/contracts:** unit tests for validation, normalization, limits, migrations, and replay/idempotency.
- **IndexedDB:** transaction, quota, corruption, interrupted migration, and legacy fixture tests.
- **Browser operations:** fake-adapter failure injection plus loaded-extension capture, close, restore, undo, and worker-restart scenarios.
- **UI:** keyboard, focus, screen-reader announcements, reduced motion, zoom, and empty/error/loading states.
- **Performance:** representative 1,000/10,000-item fixtures rather than tiny-only test data.
- **Security:** unsafe URL schemes, credential-bearing URLs, malicious imports, permission/CSP diffs, dependency audit, and secret scanning.

## Contributing, license, and project status

Contributions are welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before starting and follow the [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) in every project space. Tabby is available under the permissive [MIT License](LICENSE).

Coordinate in an issue before large changes so two contributors do not modify the same ownership boundary. Final name/trademark review, maintainer governance, and a dedicated private vulnerability-reporting contact remain release blockers before describing the repository as public-release ready.

Do not open a public issue containing an exploitable vulnerability, credentials, raw URLs, workspace content, or user exports. Contact a maintainer privately until `SECURITY.md` provides the final disclosure channel.

Useful project documents:

- [`roadmap.md`](roadmap.md) — remaining topic cards, dependencies, owners, and merge order.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contribution workflow and pull-request expectations.
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) — expected community behavior and reporting process.
- [`LICENSE`](LICENSE) — MIT terms for using and contributing to Tabby.
- [`docs/plans/plasmo-and-phase-2.md`](docs/plans/plasmo-and-phase-2.md) — staged extension migration plan.
- [`docs/threat-model/local-alpha.md`](docs/threat-model/local-alpha.md) — current local security model.
- [`docs/product-review/local-web-alpha.md`](docs/product-review/local-web-alpha.md) — product assumptions and review boundary.

### Create GitHub issues from the roadmap

The roadmap issue script is dry-run by default. It selects every card not marked `done`, preserves the card's scope and dependency text, and embeds a stable marker so repeated applied runs skip issues that already exist.

```bash
npm run roadmap:issues
npm run roadmap:issues -- --card T1.1
npm run roadmap:issues -- --apply --repo owner/repository
```

Roadmap owner names are not assumed to be GitHub usernames. Map them explicitly when applying issues; for example, `npm run roadmap:issues -- --apply --assign tommy=actual-login`. Use `--include-done` only when historical completed cards should also become issues. The applied mode requires an authenticated [GitHub CLI](https://cli.github.com/) installation with permission to create issues.
