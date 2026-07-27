# Plasmo migration and Phase 2 execution plan

## Objective

Move Tabby to a scalable extension toolchain without weakening its local-first and no-data-loss guarantees, finish the missing Phase 1 organization foundation, and then deliver the Phase 2 private-alpha surfaces. This plan deliberately excludes account sync, sharing, collaboration, content scripts, and broad host permissions.

## Delivery order

### Milestone 0 — Evidence and baselines

- Verify the latest official Plasmo documentation, supported Node/package-manager versions, Manifest V3 behavior, browser targets, maintenance activity, and migration guidance.
- Capture the current unpacked extension's manifest, CSP, permissions, package contents, IndexedDB origin/name/version, warm/cold startup, and capture/undo behavior.
- Make the loaded-extension Playwright scenario runnable in CI and add worker-termination checkpoints around each journal transition.
- Gate: maintainers approve the pinned version and baseline report; all current extension tests pass.

### Milestone 1 — Shared foundation before UI migration

- Establish a workspace layout with framework-independent packages for domain entities/export contracts, URL normalization, local-store migrations, browser interfaces, UI tokens, and test fixtures.
- Define a canonical versioned model for workspaces, groups, ordered items, capture operations, and tombstones. Preserve import of the current web and extension version-1 data.
- Replace whole-state storage with indexed entity/operation stores through resumable, fixture-tested migrations; add quota, corruption, interruption, and rollback behavior.
- Gate: both existing clients read legacy fixtures, round-trip exports, and pass 1,000-item performance and failure-injection tests.

### Milestone 2 — Parallel Plasmo shell

- Add a Plasmo application alongside—not over—the current extension.
- Reuse the shared domain, repository, capture service, and browser adapter. Implement only new-tab and background entry points initially.
- Add build, development, package, typecheck, lint, unit, E2E, dependency-audit, secret-scan, CSP, and generated-manifest checks to CI.
- Compare packaged permissions and files to the baseline. Fail CI on unexpected host permissions, remote code, or unsafe CSP directives.
- Gate: behavioral parity, equivalent storage upgrade, no extra permissions, reviewed artifact, and tested rollback.

### Milestone 3 — Phase 1 completion and cutover

- Deliver extension-native workspaces/groups, ordering, move, rename, archive/trash/recovery, safe restore, local search, import preview, keyboard flows, and accessible alternatives to drag-and-drop.
- Cut over to the Plasmo package only after an update from the published legacy test build preserves user data and the old build can restore from the same documented export.
- Gate: zero known data-loss defects; responsive 1,000-item fixture; capture failure injection; keyboard and screen-reader review; offline operation without signup.

### Milestone 4 — Phase 2 private-alpha hardening

- Add notes with autosave status, bulk actions, recovery history, bookmark import, storage dashboard, virtualization, indexed search, and background compaction.
- Add context-menu capture, popup quick capture, and side-panel workspace incrementally. Keep each surface thin and backed by the same command/repository layer.
- Add permission-denied UX and request any new optional permission only when its feature is invoked.
- Produce signed reproducible packages, an SBOM, store privacy disclosures, and Chromium update/service-worker test results.
- Gate: 30 opted-in daily users for two weeks, export/reimport recovery drill, crash-free target, performance budgets, and no open critical accessibility or security findings.

## Workstreams and ownership boundaries

| Workstream | Owns | Must not own |
| --- | --- | --- |
| Domain/contracts | invariants, commands, schemas, migrations | React, Plasmo, `chrome.*`, SQL |
| Local store | transactions, indexes, operation journal, recovery | UI state and browser mutation |
| Browser adapter | tabs/sessions/context-menu capability mapping | product rules and persistence |
| Extension shell | entry points, routing, surface composition | duplicated domain/storage logic |
| UI system | accessible components and tokens | direct repository or browser calls |
| Hosted web | account/settings/shared views later | local workflow dependency on network |

## Quality and security gates

- Unit and property tests cover URL normalization, replay, ordering, migrations, and export round trips.
- Fake-browser tests inject storage, removal, restoration, and worker interruption failures.
- Loaded-extension E2E covers install, upgrade, new tab, popup, side panel, context menu, close, undo, offline use, and permission denial.
- Performance fixtures measure startup, search, memory, transaction duration, migration time, and package size at 1k/10k/50k items.
- Release checks inspect generated permissions/CSP, pin dependencies, scan licenses/secrets/vulnerabilities, produce an SBOM, and prohibit remote extension code.
- Privacy checks ensure logs and optional diagnostics never contain raw URLs, titles, notes, workspace names, credentials, or export data.

## Explicitly deferred

- Account and multi-device synchronization remain Phase 3 work.
- Firefox shipping remains a later feasibility gate even if the toolchain can build it.
- Collaboration, sharing, AI classification, page-content collection, rich text, and `<all_urls>` access require separate evidence and ADRs.
