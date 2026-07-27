# Contributing to Tabby

Thank you for helping build Tabby, a streamlined local-first tool for saving, organizing, closing, and resuming browser work. We value focused changes, clear reasoning, privacy, and collaboration.

## Before you start

1. Read the [README](README.md), [roadmap](roadmap.md), relevant architectural decisions in [`docs/adr`](docs/adr), and the [Code of Conduct](CODE_OF_CONDUCT.md).
2. For anything larger than a small fix, open or claim a roadmap card or issue before coding.
3. State the files you expect to touch. Coordinate first if another contributor owns the same boundary.
4. Never include credentials, private URLs, browsing history, workspace exports, or real user content in an issue, fixture, commit, or log.

## Set up the project

```bash
npm install
cp .env.example .env
npm run dev
```

The local web workspace does not require a database or OAuth. See the README for extension loading, optional server/database setup, and environment-validation guidance.

## Make a focused change

- Create a short-lived branch from the current default branch.
- Keep domain rules outside React and direct browser API calls inside the browser adapter.
- Persist captured data before closing browser tabs.
- Validate imported data and all cross-boundary payloads; treat URLs and user-authored content as untrusted.
- Do not add browser permissions, analytics, remote extension code, external favicon requests, synchronization, or persisted-schema changes without an ADR and security/privacy review.
- Preserve supported IndexedDB and export formats with migration fixtures whenever stored data changes.
- Avoid unrelated refactors in a feature pull request.

## Validate your change

Run the checks relevant to the files you changed:

```bash
npm run format:check
npm run typecheck
npm run test:extension
npm run build
```

The current `npm run lint` and `npm run check` scripts are known to rely on the obsolete `next lint` command. Roadmap card T9.1 tracks replacing them; do not describe them as passing until that work lands.

Tests should match risk. Persistence and browser changes need failure, retry, and worker-restart coverage. UI changes need keyboard, focus, reduced-motion, zoom, and error-state review. Use synthetic URLs and content in fixtures.

## Document the handoff

Every task must add `changelog/<feature>.md` with:

1. summary of changes and affected files;
2. tests, security checks, and performance considerations;
3. recommended follow-up work and known debt; and
4. a ready-to-copy prompt for the next task.

Update the roadmap card's owner and status when applicable.

## Open a pull request

In the pull request:

- explain the problem and the chosen approach;
- list tests and manual checks with their results;
- call out persisted-data, compatibility, permission, privacy, security, accessibility, and performance impact;
- describe rollout, rollback, or recovery needs; and
- link the issue or roadmap card.

Keep reviews respectful and address feedback with a follow-up commit or a clear explanation. Maintainers may ask to split changes that cross ownership boundaries.

## Security and conduct

Do not publicly disclose an exploitable vulnerability or sensitive user data. Use the repository's private reporting channel until a dedicated `SECURITY.md` contact is published. All participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
