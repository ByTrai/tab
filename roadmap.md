# Tabby Remaining Work Roadmap

> **Status:** execution plan after the local web alpha, safe-capture extension spike, and shared-contract foundation
> **Last updated:** 2026-07-29
> **Team model:** two developers working in parallel, each assisted by AI
> **Reference:** TabExtend is workflow inspiration only; use original code, design, copy, and assets

## 1. How to use this roadmap

This is a topic-based assignment board, not a calendar. Each card is designed to have one accountable human and a narrow file boundary so `@tommy` and `@romeo` can work concurrently without repeatedly editing the same files.

Copy the card header into an issue and replace `unassigned`:

```md
Owner: @tommy
AI session: <link or identifier>
Status: ready | in-progress | review | blocked | done
Depends on: T0.1
Touch set: packages/domain/**, apps/extension/test/**
Out of scope: UI styling, browser permissions
```

### Assignment rules

1. **One owner per card.** The owner is accountable for design, tests, documentation, and integration—not merely code generation.
2. **One active card per person.** Finish or explicitly park it before claiming another.
3. **Claim a touch set.** If two cards need the same core file, sequence them or split an interface first.
4. **Contracts before consumers.** Contract changes merge before local-store, extension, or web consumers. Never coordinate shared work through copied types.
5. **Integrate frequently.** Rebase/merge the shared branch after every completed foundation card; avoid long-running topic branches.
6. **AI output receives human review.** The owner verifies migrations, permissions, destructive operations, security assumptions, and generated tests.
7. **No opportunistic scope.** Put cross-topic findings in a new card instead of editing another owner's area.
8. **Definition of done is mandatory.** Tests, failure states, accessibility, docs, and the required `changelog/<feature>.md` handoff are part of the card.

### Conflict map

| Topic            | Primary ownership boundary                 | Coordinate before touching       |
| ---------------- | ------------------------------------------ | -------------------------------- |
| Product/brand    | `docs/product-review/**`, governance files | landing copy, store copy         |
| Contracts/domain | shared contract/domain packages            | every persisted/API shape        |
| Local store      | IndexedDB repositories/migrations          | domain schemas, UI commands      |
| Browser platform | browser adapter, worker, manifest          | permissions, capture rules       |
| Extension UI     | extension entry points/components/styles   | shared UI tokens, commands       |
| Web app          | `src/app/**`, web client adapters          | landing routes, domain contracts |
| Landing/docs     | marketing routes/assets, README/docs       | root routing and brand system    |
| Hosted backend   | `src/server/**`, Drizzle migrations        | contracts, auth, sync protocol   |
| Quality/release  | CI, fixtures, E2E, release scripts         | all topic-specific test owners   |

Files with high conflict risk (`package.json`, lockfile, root configs, shared schemas, manifest, root layout/styles) require a short coordination note before editing.

## 2. What is already complete

- **Web local alpha:** browser-local workspaces, groups, links/notes/tasks, search, and versioned JSON import/export.
- **Safe-capture risk spike:** MV3 current-window inventory, durable operation journal, save-and-close ordering, restart recovery, and undo.
- **Permission baseline:** only `tabs`; no content scripts, host permissions, analytics, or remote code.
- **Architecture decisions:** local-first web boundary, safe capture, staged Plasmo adoption, and dependency-free shared workspace contracts.
- **Shared contract slice:** common entity vocabulary, limits, HTTP(S) URL normalization, duplicate keys, and extension journal migration tests.

These are foundations, not a finished product. The web and extension still use separate stores and incomplete experiences. Sync, public sharing, collaboration, and a production landing site do not exist.

## 3. Recommended duo sequence

The lanes below maximize parallel work while protecting data-model and configuration hotspots.

| Sprint | Developer A                     | Developer B                                                  | Integration gate                                        |
| ------ | ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| 0      | T0.1 governance/brand decisions | T9.1 repair quality scripts/CI baseline                      | license/name decided; green baseline                    |
| 1      | T1.1 canonical domain model     | T7.1 landing information architecture and original wireframe | contracts reviewed; no shared UI implementation yet     |
| 2      | T2.1 IndexedDB entity store     | T4.1 Plasmo parallel shell                                   | persistence interfaces frozen; permission diff clean    |
| 3      | T3.1 browser capability adapter | T5.1 accessible design system                                | commands and UI primitives integrate through interfaces |
| 4      | T4.2 extension organization UI  | T7.2 landing implementation                                  | separate routes/apps and styles; both pass build/a11y   |
| 5      | T4.3 restore/search/import      | T6.1 web workspace convergence                               | common export fixtures and interaction terminology      |
| 6      | T9.2 E2E/recovery matrix        | T8.1 optional account foundation                             | local release gate before sync begins                   |

After Sprint 6, prioritize observed private-alpha problems. Do not start sync merely because a developer is free.

## 4. Topic 0 — Open-source product and governance

### T0.1 — Decide identity and legal foundation

**Owner:** `@tommy`
**Status:** `done` (name remains Tabby pending formal trademark clearance before public store listing; DCO required via CONTRIBUTING — no separate CLA)
**Touch set:** root legal/community files, `docs/product-review/**`
**Depends on:** none

**Deliverables**

- Confirm project name after trademark, package, repository, and domain checks.
- MIT license selected and added; confirm copyright attribution with the project owner before the first public release.
- `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` added. `SECURITY.md` and GitHub issue/PR templates added; DCO required for contributions (see CONTRIBUTING).
- Define maintainer roles, issue/PR templates, decision process, and release ownership.
- Record product terminology so web, extension, landing page, and store listing do not drift.

**Done when:** a new contributor knows how to contribute, report a vulnerability privately, and understand the license; the landing page has approved name and claims.

### T0.2 — Clean-room reference and user discovery

**Owner:** `unassigned`
**Status:** `ready`
**Touch set:** `docs/product-review/**` only
**Depends on:** none

- Inventory public TabExtend workflows without copying code, copy, assets, or private APIs.
- Interview 8–12 tab-heavy users and validate capture → close → resume as the core job.
- Document evidence separately from hypotheses; define activation and reliability measures without raw-content telemetry.
- Produce prioritized gaps and explicitly reject features without evidence.

**Done when:** each P0/P1 feature links to observed behavior or a documented product decision.

## 5. Topic 1 — Domain model and portable contracts

### T1.1 — Canonical local workspace model

**Owner:** `@tommy`
**Status:** `done`
**Touch set:** shared contracts/domain package, contract tests, ADR
**Depends on:** T0.1 terminology

- Define versioned `Workspace`, `Group`, ordered `Item` (`link | note | task`), capture operation, recovery record, and tombstone contracts.
- Choose client-generated IDs and fractional ordering; specify maximum sizes and UTC timestamp semantics.
- Move web-only validation/search rules behind dependency-free contracts without introducing React, Next.js, IndexedDB, SQL, or `chrome.*` dependencies.
- Preserve web schema v1 and extension journal v1/v2 fixtures; unknown future versions fail closed and report recovery guidance.

**Validation note:** dependency-free contract and migration tests pass; web app now migrates v1→v2 on load and exports schema v2.

**Done when:** both clients consume one vocabulary; import/export round trips are deterministic; migration and malicious-input fixtures pass.

### T1.2 — Command and repository interfaces

**Owner:** `unassigned`
**Status:** `done`
**Touch set:** domain application service/interfaces and tests
**Depends on:** T1.1

- Define commands for create/rename/move/archive/trash, capture, restore, import/export, and undo.
- Keep transaction durability distinct from browser-side effects; require idempotency keys for retryable commands.
- Define typed error categories for validation, quota, corruption, permissions, partial browser failure, and unsupported capability.
- Add invariant and property tests for reorders, replay, duplicate identity, and rollback.
- Web `/app` now applies mutations through `applyCommand` (create/rename/trash/restore/toggle/createItem/import).

**Done when:** UIs can use commands without knowing IndexedDB or Chromium implementation details.

## 6. Topic 2 — Local storage, migration, and recovery

### T2.1 — Indexed entity repository

**Owner:** `unassigned`
**Status:** `done` (web cut over to `@tabby/local-store` EntityRepository with legacy `tabby-workspace` migration + pre-migration backup download)
**Touch set:** local-store package/repositories, migration fixtures
**Depends on:** T1.1, T1.2

- Replace whole-state aggregates with indexed entity and operation stores.
- Atomically write entity mutations and journal records; make retries idempotent.
- Add resumable upgrades from both current client stores without deleting unknown/corrupt data.
- Report quota and corruption states with export/recovery guidance.
- Benchmark 1k/10k/50k records and document compaction thresholds.

**Done when:** interruption/failure injection cannot produce acknowledged-but-missing captures; legacy fixtures upgrade and round-trip.

### T2.2 — Import, export, trash, and recovery

**Owner:** `unassigned`
**Status:** `done` (dry-run `previewWorkspaceImport`; 30-day trash retention purge; atomic replace clears trash)
**Touch set:** import/export and recovery services, fixtures
**Depends on:** T2.1

- Publish a documented export schema independent of internal rows.
- Validate file type, schema version, size, collection bounds, and URLs before writes.
- Provide dry-run creates/updates/skips/conflicts; apply atomically or leave a recovery record.
- Add trash retention and restore behavior; owner decision required for purge interval.
- Support current and previous export versions through tested migrations.

**Done when:** export → clear profile → import recovery drills succeed and malformed imports cannot exhaust memory or partially apply.

## 7. Topic 3 — Browser platform and no-loss operations

### T3.1 — Capability-based browser adapter

**Owner:** `unassigned`
**Status:** `done`
**Touch set:** browser adapter/fakes/tests; avoid UI
**Depends on:** T1.2 interface review

- Model current-window tabs, restricted schemes, pinned/audible/incognito/discarded state, sessions restore, popup limits, and permission denial.
- Keep `chrome.*` isolated; expose capabilities so future Firefox work fails gracefully rather than branching throughout UI.
- Normalize browser failures and never log raw URLs/titles.
- Add fake-browser tests for partial close/open failures and worker suspension at every operation transition.

**Done when:** capture/restore behavior is deterministic under retries and every unsupported capability has a safe error.

### T3.2 — Restore and duplicate policy

**Owner:** `unassigned`
**Status:** `done` (popup-blocked matrix / loaded-extension E2E still follow-up)
**Touch set:** browser/domain orchestration and focused tests
**Depends on:** T2.1, T3.1

- Restore one item, group, or workspace with a configurable confirmation threshold.
- Offer focus-existing/open-copy/move-saved-item behavior for duplicates.
- Report per-tab partial failures; never mark a restore wholly successful when only some tabs opened.
- Preserve pinned/restricted tab safety and use only reviewed URL schemes.

**Done when:** large restore, duplicate, popup-blocked, and partial-failure scenarios pass in fake and loaded-extension tests.

## 8. Topic 4 — Extension application

### T4.1 — Parallel Plasmo shell and safe cutover

**Owner:** `unassigned`
**Status:** `ready`
**Touch set:** new extension shell/build config; current extension changes only for shared interfaces
**Depends on:** T9.1 baseline, official framework verification

- Verify the current official Plasmo compatibility/security facts and pin a reviewed version.
- Build new-tab and worker entry points alongside—not over—the current unpacked extension.
- Reuse commands, repository, and browser adapter; do not duplicate product rules.
- Compare generated package, permissions, CSP, startup, storage upgrade, capture, and undo to baseline.
- Preserve a rollback artifact until an installed legacy profile upgrades without data loss.

**Done when:** packaged parity tests pass with no additional permission, remote code, or storage reset. See `docs/plans/plasmo-and-phase-2.md`.

### T4.2 — Extension organization workspace

**Owner:** `unassigned`
**Status:** `done` (keyboard polish / a11y audit still follow-up)
**Touch set:** extension new-tab UI and UI tests
**Depends on:** T2.1, T4.1, T5.1

- Add workspace/group create, rename, reorder, collapse, archive, trash, and recovery.
- Add accessible link cards, multi-select, move, and pointer plus keyboard reordering.
- Keep capture inventory and durable status visible without turning persistence state into component-local truth.
- Cover loading, empty, quota, corruption, permission-denied, and partial failure states.

**Done when:** a keyboard-only user can capture five tabs, organize them across groups, reload, and recover the same order.

### T4.3 — Search, notes, import, and quick surfaces

**Owner:** `unassigned`
**Status:** `done` (notes + autosave status, tasks toggle, import dry-run/export on new-tab; context-menu/popup/side-panel still deferred)
**Touch set:** extension feature surfaces
**Depends on:** T2.2, T3.2, T4.2

- Add indexed local search across safe fields with a 10k-item p95 target under 100 ms after index readiness.
- Add plain-text notes with visible autosave status and lightweight task completion.
- Add import/export preview, bookmark import report, and storage dashboard.
- Then add context-menu and popup/side-panel capture as thin consumers of the same commands.
- Request optional permissions only at feature invocation and document their value.

**Done when:** every surface yields identical command results and no surface owns a second storage or capture implementation.

## 9. Topic 5 — Design system and accessibility

### T5.1 — Original shared design language

**Owner:** `unassigned`
**Status:** `done` (monochrome technical design kit applied across landing, `/app`, and extension)
**Touch set:** design tokens/shared primitives and design docs
**Depends on:** T0.1 identity

- Define original typography, spacing, color, icon, elevation, focus, motion, and responsive tokens; do not clone TabExtend visuals.
- Build primitives for buttons, dialogs, menus, cards, status, toast, selection, and sortable lists.
- Support light/dark/system themes, 200% zoom, high contrast, reduced motion, and narrow extension surfaces.
- Specify keyboard equivalents and screen-reader announcements for drag-and-drop.

**Done when:** representative components meet WCAG 2.2 AA target and can be consumed without importing storage/browser code.

### T5.2 — Accessibility verification

**Owner:** `unassigned`
**Status:** `blocked`
**Touch set:** accessibility tests/audit reports and small targeted fixes
**Depends on:** T4.2, T6.1, T7.2

- Add automated accessibility smoke tests.
- Manually test keyboard-only flows, focus restoration, NVDA/VoiceOver, 200% zoom, contrast, and reduced motion.
- Track issues by severity; critical blockers prevent release.

**Done when:** core capture, organize, restore, backup, and landing navigation have documented results and no critical finding.

## 10. Topic 6 — Web workspace convergence

### T6.1 — Adopt common commands and storage

**Owner:** `unassigned`
**Status:** `done`
**Touch set:** `src/app/_components/**`, `src/lib/**`, web adapter tests
**Depends on:** T1.2, T2.1, T5.1

- Refactor the existing web alpha behind common commands/repositories without a big-bang rewrite.
- Preserve current browser data with migration and export-before-upgrade guidance.
- Match extension terminology, error states, keyboard semantics, and import/export format.
- Keep the workspace fully usable offline and account-free.

**Done when:** the web and extension pass the same contract fixtures and local workflows without sharing UI-specific state.

### T6.2 — Application routing boundary

**Owner:** `unassigned`
**Status:** `done`
**Touch set:** Next.js routing/layout only; coordinate with T7.2
**Depends on:** T7.1

- Decide whether marketing owns `/` and the app moves to `/app`, or marketing is deployed separately.
- Preserve bookmarks and clarify extension-to-web navigation.
- Prevent marketing dependencies, analytics, and server availability from entering the local workspace bundle.

**Recommendation:** use `/` for the public landing page and `/app` for the web workspace before public launch, with an explicit migration/redirect plan.

**Done when:** route ownership is documented and both surfaces can deploy/test independently. **Shipped:** `/` marketing, `/app` workspace.

## 11. Topic 7 — Landing page and public documentation

The landing page is a release feature, not an afterthought. It should communicate the same workflow category as tabextend.com—visual tab organization, save/close/resume, notes/tasks, privacy—while using Tabby's own information architecture, copy, visuals, and evidence-backed claims.

### T7.1 — Information architecture, copy, and wireframe

**Owner:** `unassigned`
**Status:** `ready`
**Touch set:** landing specification/content docs only
**Depends on:** T0.1 for final brand/legal copy; may start with placeholders

- Define audiences and primary CTA: install alpha, try local web app, view source, or join waitlist.
- Specify hero, workflow demo, benefits, local-first/privacy explanation, feature grid, open-source/self-hosting status, FAQ, and footer/legal links.
- Create responsive, original wireframes and a content inventory with claim owners.
- Label unavailable features honestly; never advertise sync, E2EE, Firefox, self-hosting stability, collaboration, or store availability before their gates pass.
- Establish privacy-safe metrics or choose no analytics; never capture workspace content or outbound saved URLs.

**Done when:** product/engineering approve copy, CTA, routing, accessibility annotations, performance budget, and legal/privacy requirements.

### T7.2 — Implement the landing page

**Owner:** `unassigned`
**Status:** `done` (Lighthouse budgets/smoke suite still follow-up)
**Touch set:** dedicated marketing route/components/assets; coordinate root layout/styles once
**Depends on:** T5.1, T6.2, T7.1

- Implement responsive server-rendered sections with semantic headings and keyboard-visible navigation.
- Use optimized local assets and an original product demo; avoid third-party tracking, remote fonts, and copied reference assets.
- Add metadata, social image, favicon, canonical URL, sitemap/robots decisions, and structured data only where truthful.
- Meet budgets: minimal client JavaScript, no layout shift, optimized images, and measured Core Web Vitals.
- Add smoke, accessibility, metadata/link, responsive visual, and production-build tests.

**Done when:** landing and `/app` boundaries work, claims match shipped capability, and Lighthouse-style performance/accessibility checks meet agreed thresholds.

### T7.3 — Public developer and user docs

**Owner:** `unassigned`
**Status:** `in-progress` (backup/recovery guide added; full contributor timing drills + architecture diagrams still open)
**Touch set:** `README.md`, `docs/**`, future docs site
**Depends on:** T0.1 for final contribution/security details

- Keep setup, architecture, environment, extension loading, tests, and troubleshooting current.
- Add user backup/recovery, permission rationale, privacy, data format, and release/update guides.
- Generate architecture diagrams from stable boundaries, not aspirational components.
- Verify a clean contributor setup in under 15 minutes on each supported platform.

**Done when:** a new contributor and a local-only user can succeed without maintainer assistance.

## 12. Topic 8 — Hosted account and synchronization (after local gate)

### T8.1 — Account and tenant foundation

**Owner:** `unassigned`
**Status:** `blocked`
**Touch set:** `src/server/**`, database migrations, auth tests
**Depends on:** T0.1 policies, T1.1, private-alpha local release gate

- Finish Better Auth configuration, secure cookies/CSRF controls, verification, session/device management, and account deletion.
- Apply tenant authorization inside service/repository boundaries for every read/write.
- Add rate limits, quotas, audit events with content redaction, migration rollback, and backup/restore drills.
- Keep signup optional; preview and back up local-to-account merges before upload.

**Done when:** authorization-matrix tests find no cross-tenant path and local mode has no server dependency.

### T8.2 — Operation-log synchronization

**Owner:** `unassigned`
**Status:** `blocked`
**Touch set:** sync package, API contracts/routes, convergence tests
**Depends on:** T2.1, T8.1

- Implement cursor pagination, idempotent upload, retry/backoff, tombstones, bounded conflict history, and deterministic field-level merge.
- Add visible offline/pending/error/conflict/device status.
- Property-test randomized two-device operation sequences, stale-device resurrection, compaction, and restore.
- Do not claim E2EE; transport/database encryption is not end-to-end encryption.

**Done when:** randomized convergence tests pass, recovery objectives are drilled, and beta users understand status/conflicts.

### T8.3 — Sharing and collaboration (deferred)

**Owner:** `unassigned`
**Status:** `blocked`
**Depends on:** reliable T8.2 plus user evidence

- First consider revocable, expiring, read-only share links with privacy preview and abuse controls.
- Collaborative editing, presence, comments, CRDTs, mobile, AI classification, and content indexing require separate RFCs, cost models, threat models, and evidence.

**Done when:** each proposed feature has an owner, success/removal metric, abuse model, operating-cost estimate, and independent security review plan.

## 13. Topic 9 — Quality, security, CI, and release

### T9.1 — Repair and enforce the quality baseline

**Owner:** `@tommy`
**Status:** `done`
**Touch set:** package scripts, ESLint/config, CI workflows
**Depends on:** none

- Replace obsolete `next lint` scripts with direct ESLint commands.
- Add required formatting, lint, typecheck, unit, extension, production build, dependency/license, and secret checks.
- Pin supported Node/npm versions and cache dependencies safely.
- Make generated manifest permission/CSP diffs reviewable and fail on unexpected privilege.

**Done when:** a clean checkout has one documented green command set and protected branches require it.

### T9.2 — Recovery, browser E2E, and performance matrix

**Owner:** `unassigned`
**Status:** `in-progress` (Playwright extension E2E + recover message in CI via xvfb; 1k-item bench script recorded; 10k/50k + full interruption matrix still open)
**Touch set:** shared fixtures, E2E, performance/recovery harness
**Depends on:** T2.1, T3.1, T4.1

- Test install/update, worker termination at every journal stage, offline use, quota exhaustion, corruption, interrupted import, permission denial, close/open partial failure, and rollback.
- Add 1k/10k/50k fixtures for startup, search, memory, transaction, migration, and package size.
- Define reference hardware and record results instead of presenting targets as facts.

**Targets:** warm new-tab p75 <300 ms; cold p75 <1 s; local command p95 <100 ms; indexed 10k search p95 <100 ms; zero known data-loss defects.

### T9.3 — Production and open-source release

**Owner:** `unassigned`
**Status:** `blocked`
**Depends on:** T0.1, T5.2, T7.2, T9.1, T9.2

- Produce signed reproducible extension artifacts, SBOM/provenance, store permission/privacy disclosures, and rollback instructions.
- Commission security and accessibility review; close all critical findings.
- Publish compatibility/deprecation policy and supported browser/update matrix.
- Add Docker self-hosting only after health, migration, upgrade, rollback, backup, and restore procedures pass clean-install drills.

**Done when:** release artifacts are reproducible, recovery works, critical docs exist, and no unsupported capability is marketed.

## 14. Cross-topic release gates

### Gate A — Foundation ready

- T0.1, T1.1, T1.2, and T9.1 complete.
- Shared persisted contracts have backward-compatibility fixtures.
- Name/license/security channel are resolved.

### Gate B — Local private alpha

- T2.1, T2.2, T3.1, T3.2, T4.1, T4.2, T5.1, and T9.2 complete.
- No known data-loss defect; capture failure never closes a tab.
- Offline/account-free use, backup/reimport, upgrade, rollback, keyboard, and screen-reader flows pass.
- 1,000-item daily workflow is responsive on documented reference hardware.

### Gate C — Public open-source beta

- T0.2, T4.3, T5.2, T6.1, T6.2, T7.2, T7.3, and T9.3 complete.
- At least 30 consenting daily users complete a two-week private-alpha observation period.
- Landing copy matches actual capabilities; contributor setup is verified.
- Critical accessibility, security, privacy, and recovery findings are closed.

### Gate D — Optional hosted sync beta

- T8.1 and T8.2 complete after Gate C local reliability evidence.
- Randomized two-device convergence and cross-tenant authorization suites pass.
- Export, deletion, device revocation, retention, backup, and restore are documented and drilled.

## 15. Definition of done for every card

A card is complete only when:

- acceptance behavior, non-goals, dependencies, and affected ownership boundaries are documented;
- domain/authorization rules live below presentation code;
- loading, empty, offline, permission-denied, validation, partial-failure, retry, and recovery states appropriate to the feature exist;
- keyboard, screen reader, zoom, contrast, and reduced-motion impact is reviewed;
- risk-proportionate unit/integration/E2E tests and migration fixtures pass;
- unsafe URLs/input, logs, permissions, retention, secrets, and abuse paths are reviewed;
- performance is measured on representative data and regressions are recorded;
- user/developer docs, compatibility, export, rollout, rollback, and recovery are updated;
- `changelog/<feature>.md` contains summary, validation, next recommendations, and a ready-to-use next prompt; and
- the issue/card shows its owner, final status, pull request, and any deliberately deferred debt.

## 16. Current assignment

```md
T9.2 — Recovery, browser E2E, and performance matrix
Owner: unassigned
Status: in-progress
Touch set: shared fixtures, E2E, performance/recovery harness
Next: expand interruption matrix + 10k/50k benches; keep T4.1 Plasmo deferred; do not start T8 sync
```

Claim the next ready card only after finishing or parking the active card, following the one-active-card rule. Ready/unblocked after this pass: T0.2, T4.1, T4.3 (unblocked by T2.2), T5.2, T7.1, T7.3. Hosted sync (T8) remains blocked until Gate C.
