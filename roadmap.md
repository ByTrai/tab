# Open-Source Tab Workspace — Product and Engineering Roadmap

> **Status:** discovery and implementation plan  
> **Last updated:** 2026-07-26  
> **Audience:** maintainers, contributors, designers, security reviewers, and prospective users

## 1. Executive summary

The product should be an open-source, local-first browser workspace that turns the browser's new-tab page into a visual place to capture, organize, close, restore, search, and share web resources. Its central promise is not merely “bookmark management.” It is **continuity of work**: a user can move active tabs out of the tab strip without losing context, organize them alongside notes and tasks, and resume that context on any authorized device.

TabExtend is the product reference, not source code or a brand to copy. Public descriptions position it as a visual tab manager in which users drag tabs into groups, organize groups into spaces, add notes and to-dos, and synchronize their workspace. This roadmap translates that workflow into an independently designed open-source product with explicit privacy, portability, accessibility, and self-hosting goals.

### Product thesis

People use open tabs as short-term memory because bookmarks are too permanent and browser sessions are too fragile. A useful product bridges three time horizons:

1. **Now:** see, group, deduplicate, and close currently open tabs.
2. **Soon:** retain project context with notes, tasks, and named workspaces.
3. **Later:** find archived resources, restore a session, or export everything without lock-in.

### Recommended first release

Build a Chromium extension plus a web application backed by the existing Next.js/tRPC/Drizzle stack. Make capture and restore work without an account, persist locally first, and add optional encrypted synchronization after the core interaction is trustworthy. Do not start with collaboration, AI classification, mobile apps, or Firefox: those features multiply complexity before the main workflow is validated.

## 2. Research boundary and confidence

“100% understanding” of a closed-source product is not possible from public material alone. Internal algorithms, data models, analytics, unreleased behavior, and failure handling are not observable. Additionally, the research environment could not retrieve the live TabExtend pages on 2026-07-26 (the network gateway returned HTTP 401/403), so claims below must be validated against the live product before treating them as parity requirements.

This roadmap deliberately separates three categories:

| Classification | Meaning | How to use it |
| --- | --- | --- |
| Reference behavior | Repeatedly represented in TabExtend's public product positioning and commonly documented workflow | Include in parity discovery and user testing |
| Product requirement | A capability this open-source product should provide, whether or not the reference does | Treat as our specification |
| Hypothesis | Potentially valuable but not yet validated | Test before scheduling implementation |

### Reference material to validate manually

- [TabExtend home page](https://www.tabextend.com/)
- [TabExtend Chrome Web Store search](https://chromewebstore.google.com/search/tabextend)
- TabExtend onboarding, settings, account, billing, privacy, help, import/export, and sharing screens
- Browser permission prompts and the extension manifest installed from the store
- Offline, multi-device conflict, deleted-item recovery, and account deletion behavior

### Clean-room discovery checklist

Before implementation reaches beta, a product owner should record a dated behavior inventory using a fresh test account:

1. Capture screenshots/video for onboarding and every user-facing screen.
2. Record browser permissions and which action first requires each permission.
3. Exercise create, edit, move, close, restore, undo, delete, and search operations.
4. Test 0, 1, 100, 1,000, and 10,000 saved items where practical.
5. Test offline edits on two devices followed by reconnection.
6. Export data, delete the account, and inspect retention messaging.
7. Catalog keyboard navigation, responsive behavior, empty states, limits, and errors.
8. Document facts, not copied assets, text, source code, or private API behavior.

The outcome should be a comparison matrix maintained as an issue or discussion. It must not block building a differentiated, useful MVP.

## 3. Product definition

### Jobs to be done

- **When my tab strip becomes crowded**, help me save related tabs together and close them safely so I can focus without losing work.
- **When I switch projects**, let me restore the right set of pages and supporting notes quickly.
- **When I vaguely remember a page**, help me find it by title, URL, domain, workspace, tag, or note text.
- **When I change machines or browsers**, let me bring my workspace with me without surrendering ownership of my data.
- **When I plan research**, let saved links, lightweight notes, and tasks coexist without forcing me into a full project-management tool.
- **When I make a mistake**, provide undo, history, and recovery rather than silent data loss.

### Target users

1. Researchers, students, developers, writers, and knowledge workers with tab-heavy workflows.
2. People who frequently context-switch across projects.
3. Privacy-conscious users who need local-only operation or self-hosting.
4. Small teams that may later share curated collections; team collaboration is not an MVP target.

### Non-goals for the first release

- A general-purpose document editor or full task-management suite.
- A browser engine, password manager, web crawler, or read-it-later content mirror.
- Automated capture of page content behind authentication.
- Real-time multiplayer editing.
- Pixel-for-pixel imitation of TabExtend, its copy, brand, icons, or proprietary interactions.
- Monetization or feature gating before reliability and portability are proven.

### Product principles

1. **No-loss operations:** capture is acknowledged only after durable local storage; closing tabs is a separate, recoverable action.
2. **Local-first:** core workflows work offline and without signup.
3. **Progressive permission:** request the narrowest browser permission at the moment its value is clear.
4. **Portable by default:** documented JSON export/import and no proprietary hostage data.
5. **Keyboard and screen-reader complete:** accessibility is an acceptance criterion, not polish.
6. **Fast at scale:** virtualized views and indexed search must remain responsive with 10,000 items.
7. **Observable but private:** diagnostics are opt-in, redacted, and never contain URLs or note text by default.

## 4. Core experience and information model

### Primary loop

1. The extension opens as a new-tab dashboard (with popup/side-panel capture as later surfaces).
2. The user sees the current window's open tabs and their saved workspaces.
3. They drag one tab or select many tabs into a group within a workspace.
4. The application saves URL, title, favicon reference, ordering, and capture time locally.
5. The user chooses **Save**, **Save and close**, or **Save all except pinned**.
6. A toast exposes **Undo**; closed tabs can be restored through the browser sessions API where available or from stored URLs.
7. Later, the user opens one item, a group, or an entire workspace, with duplicate and popup warnings.

### Canonical domain model

| Entity | Essential fields | Notes |
| --- | --- | --- |
| User | id, email/identity references, settings, createdAt | Optional locally; required only for hosted sync |
| Device | id, userId, label, public key, lastSeenAt | Supports revocation and sync diagnostics |
| Workspace | id, owner scope, title, color/icon, position, archivedAt | Top-level context (“Work”, “Study”) |
| Group | id, workspaceId, title, position, collapsed, color | Ordered section or collection |
| Item | id, groupId, kind, position, createdAt, updatedAt, deletedAt | Common ordering and sync envelope |
| Link | itemId, url, normalizedUrl, title, faviconUrl, lastOpenedAt | URL is untrusted input; normalize without destroying original |
| Note | itemId, plain/rich text payload | Start with plain text; sanitize any rendered markup |
| Task | itemId, text, completedAt, dueAt | Lightweight only; recurrence is post-MVP |
| Tag | id, name, color | Many-to-many with items; defer if groups suffice initially |
| Operation | id, deviceId, entityId, type, payload, logicalClock | Append-only sync/change record |
| Tombstone | entityId, deletedAt, purgeAfter | Prevents deleted records reappearing during sync |

All identifiers should be client-generated UUIDv7 (or an equivalent sortable collision-resistant ID), dates stored as UTC, ordering represented with fractional keys to avoid rewriting whole lists, and every synchronized mutation be idempotent.

### Key interaction rules

- Dragging changes order; it does not close or open a browser tab.
- “Save and close” first commits locally, verifies the commit, then asks the browser to close tabs.
- Pinned, audible, discarded, incognito, internal browser, and unsaved-form tabs receive explicit handling.
- Restoring many links shows the count and respects browser popup/rate limits.
- Duplicate URLs show a choice: focus existing tab, save another reference, or move existing saved item.
- Destructive bulk actions show affected count and remain undoable until the retention window expires.
- Empty groups/workspaces are valid and do not disappear automatically.

## 5. Feature inventory

Priorities use **P0** (required for MVP), **P1** (public beta), **P2** (post-beta), and **P3** (exploration).

### Capture and browser control

| Feature | Priority | Definition of done |
| --- | --- | --- |
| Read tabs in current window | P0 | Shows title, URL, favicon, pinned/audible state; handles restricted URLs |
| Save one, selected, or all tabs | P0 | Durable local write, progress/error state, no duplicates caused by retries |
| Save and close | P0 | Never closes before persistence; undo restores closed set and prior ordering where API permits |
| Restore item/group/workspace | P0 | Opens valid URLs with confirmation threshold and duplicate policy |
| Context-menu capture | P1 | Save current page or link into recent/default destination |
| Extension popup/side panel | P1 | Quick capture without replacing new tab; shares the same data layer |
| Session snapshots | P1 | Named window snapshot with restore preview |
| Automatic rules | P3 | Domain/tag routing and scheduled cleanup, explicitly opt-in |

### Organization and planning

| Feature | Priority | Definition of done |
| --- | --- | --- |
| Workspaces and groups | P0 | Create, rename, reorder, collapse, archive, delete, and recover |
| Link cards | P0 | Editable title, safe URL display, domain/favicon, open/move/delete |
| Drag-and-drop and multi-select | P0 | Pointer and keyboard equivalents, cross-group movement, rollback on failure |
| Notes | P0 | Plain-text create/edit/search; autosave with visible state |
| Tasks/checklists | P1 | Create, complete, reopen, optional due date; filtered views |
| Tags, colors, icons | P1 | Consistent filters and accessible non-color labels |
| Favorites/recent items | P1 | Deterministic and user-controllable |
| Archive and trash | P1 | Restore support and configurable permanent deletion window |
| Templates | P2 | Duplicate a workspace/group without shared mutable records |

### Find and resume

| Feature | Priority | Definition of done |
| --- | --- | --- |
| Instant local search | P0 | Searches titles, URLs, domains, workspace/group names, notes; keyboard navigable |
| Filters and command palette | P1 | Kind, tag, date, state, workspace; commands disclose affected objects |
| Open history and recents | P1 | Locally recorded, clearable, excluded from telemetry |
| Full-text page indexing | P3 | Off by default with storage, privacy, robots, and authenticated-content policy |

### Data ownership and synchronization

| Feature | Priority | Definition of done |
| --- | --- | --- |
| IndexedDB local persistence | P0 | Offline CRUD, migrations, quota errors, backup warning, corruption recovery path |
| JSON import/export | P0 | Versioned documented schema, validation, dry-run summary, conflict choices |
| Browser bookmark import | P1 | Preserves folders/order where possible and reports skipped entries |
| Account and device sync | P1 | Optional, resumable, idempotent, visible status and conflict behavior |
| End-to-end encrypted sync | P2 | Server cannot read payload; recovery limitation is clearly explained and tested |
| Self-hosted deployment | P2 | Docker Compose, migrations, backup/restore, health checks, upgrade guide |
| WebDAV/file sync adapter | P3 | Consider only after a stable sync protocol exists |

### Sharing and collaboration

| Feature | Priority | Definition of done |
| --- | --- | --- |
| Read-only share link | P2 | Revocable, expiring, unguessable capability; no private metadata leakage |
| Publish curated collection | P2 | Explicit preview and opt-in indexing setting |
| Collaborative workspace | P3 | Roles, invitations, audit history, conflict model, abuse controls |
| Comments/presence | P3 | Only after collaboration demand and operating cost are validated |

### Platform quality

| Feature | Priority | Definition of done |
| --- | --- | --- |
| Onboarding/sample workspace | P0 | Value demonstrated without account; can reset or delete sample data |
| Responsive themes | P0 | Light/dark/system, 200% zoom, reduced motion, narrow side panel |
| Keyboard shortcuts | P0 | Discoverable, remappable where browser permits, no browser shortcut conflicts |
| Accessibility | P0 | WCAG 2.2 AA target, focus restoration, live announcements, drag alternatives |
| Localization foundation | P1 | Extracted strings, locale-safe dates, RTL-compatible layout |
| Update/migration safety | P0 | Forward migrations, rollback/backup strategy, extension update recovery |

## 6. Recommended architecture

### Repository direction

The repository currently contains a Create T3 App baseline: Next.js 15, React 19, tRPC 11, Drizzle/Postgres, Better Auth, Zod, and Tailwind CSS. Retain it for the hosted web/sync control plane, but adopt a workspace structure before extension code grows:

```text
apps/
  web/                 # Next.js account, settings, shared views, optional web workspace
  extension/           # Manifest V3 background worker, new-tab UI, popup/side panel
packages/
  domain/              # framework-independent entities, commands, invariants
  local-store/         # IndexedDB repositories and migrations
  sync/                # operation log, merge engine, transport interfaces
  ui/                  # accessible shared components and design tokens
  contracts/           # Zod API/export schemas and generated types
  test-utils/          # fixtures, fake browser APIs, deterministic clocks/IDs
docs/
  adr/                 # architectural decision records
  threat-model/        # assets, boundaries, threats, mitigations
```

Use a browser abstraction rather than calling `chrome.*` from UI components. A WebExtension-compatible adapter keeps Firefox possible later. The domain package must not depend on Next.js, React, Postgres, or browser globals.

### Local-first write path

1. UI sends a typed command to the domain service.
2. Domain validates invariants and emits a mutation/operation.
3. One IndexedDB transaction writes the entity plus operation-log entry.
4. UI updates from the local repository and reports durable success.
5. Background sync uploads pending operations when authenticated and online.
6. Server validates authorization, deduplicates operation IDs, persists, and returns a cursor.
7. Client downloads remote operations and merges deterministically.

Do not use optimistic UI to claim that browser tabs are safely captured until the IndexedDB transaction completes.

### Sync model decision

Start with operation-based last-writer-wins at the **field** level, server-issued cursor pagination, client logical clocks, tombstones, and deterministic tie-breaking by device ID. This is simpler than adopting a general CRDT prematurely. Ordered lists need fractional order keys and periodic compaction. Preserve conflicts in an audit/recovery record for a bounded period instead of silently dropping losing values.

Move to a CRDT only if real concurrent collaboration becomes a validated requirement; solo multi-device sync does not justify its dependency and debugging cost.

### API boundaries

- Every input and output uses versioned Zod contracts.
- Use cursor pagination; never return an entire mature workspace by default.
- Apply authorization in the service/repository boundary, not only tRPC routers.
- Idempotency keys are mandatory for mutation and sync endpoints.
- Export format is independent of internal database rows and includes `schemaVersion`.
- Compatibility policy: current and previous export version importable; migrations covered by fixtures.

### Authentication

Anonymous/local mode is the default. Signup should attach a local workspace to an account only after previewing merge impact. Hosted mode can use Better Auth, secure HTTP-only cookies, email verification for sensitive operations, session/device management, and CSRF protections appropriate to each transport. The extension must not store long-lived credentials in page-accessible storage.

## 7. Security, privacy, and safety

URLs and page titles may expose medical, financial, political, employer, or authentication context. Treat workspace data as sensitive even if it is “only bookmarks.”

### Threat model priorities

- Malicious URL/title/favicon rendered in the dashboard (XSS, tracking, or scheme injection).
- Compromised shared link exposing an entire private collection.
- Excessive browser permissions or content scripts observing browsing unnecessarily.
- Cross-tenant access caused by missing ownership checks.
- Sync replay, stale device resurrection, and deletion conflicts.
- Supply-chain compromise in a highly privileged extension.
- Token leakage through logs, analytics, referrers, crash reports, or export files.
- Spreadsheet formula injection if CSV is ever supported.

### Required controls

1. Prefer `tabs`, `storage`, `sessions`, and narrowly scoped permissions; avoid `<all_urls>` unless a reviewed feature cannot work without it.
2. Render user strings as text; sanitize rich text with an allowlist; permit opening only reviewed schemes (`http`, `https`, and explicitly handled browser pages).
3. Fetch favicons through a privacy-aware strategy or local browser data; never leak full URLs to a third-party favicon service by default.
4. Enforce owner/member predicates on every server query and mutation, backed by tenant-bound repository methods and authorization tests.
5. Encrypt in transit and at rest; for true privacy, implement audited client-side encryption rather than claiming database encryption is E2EE.
6. Add Content Security Policy suitable for Manifest V3 and Next.js; no remote extension code and no `unsafe-eval`.
7. Redact URLs, titles, note text, tokens, and emails from structured logs.
8. Rate-limit authentication, sharing, import, and sync endpoints; cap payload size and decompression ratio.
9. Provide device/session revocation, share-link rotation, account export, and deletion.
10. Pin dependencies, enable automated dependency review, produce an SBOM/release provenance, and document vulnerability reporting.

### Privacy defaults

- No account, analytics, history upload, page-content capture, or AI processing by default.
- Separate necessary operational metrics from optional product analytics.
- Consent must be granular and reversible; “Do Not Track” alone is not consent.
- Publish retention periods and distinguish local deletion, trash retention, server tombstones, and backup expiry.

## 8. Delivery roadmap

Dates should be assigned only after team capacity and browser targets are known. Gates are evidence-based rather than calendar-based.

### Phase 0 — Discovery and foundations

**Goal:** agree on the product boundary and prevent early architectural rework.

- Perform and publish the clean-room reference behavior inventory.
- Interview 8–12 tab-heavy users; validate capture/close/resume as the main job.
- Select a neutral project name and conduct trademark/package/domain checks.
- Choose an OSI-approved license and contributor model; recommendation: AGPL-3.0 for network copyleft or MPL-2.0 for easier ecosystem adoption, after legal review.
- Create monorepo layout, ADR template, contribution guide, code of conduct, security policy, and issue templates.
- Define browser support matrix and choose extension tooling (evaluate WXT and Plasmo; record decision).
- Write the initial threat model, privacy data map, export schema, and sync ADR.
- Establish CI: formatting, lint, typecheck, unit, build, license/dependency, secret scan.

**Exit gate:** clickable prototype tested with five target users; permission design and domain model reviewed; CI required on pull requests.

### Phase 1 — Local-only vertical slice (alpha)

**Goal:** save and safely restore real tabs without an account.

- Manifest V3 extension with new-tab override and browser API adapter.
- Current-window tab inventory, restricted-tab states, and multi-select.
- Workspaces, groups, links, drag/reorder, rename, archive/delete.
- IndexedDB repositories, schema migration harness, quota/error UX.
- Transactional save, save-and-close, restore, duplicate detection, and undo.
- Local search and keyboard-first command flow.
- Versioned JSON export/import with validation and preview.
- Light/dark themes, onboarding, empty/error/loading states.
- Unit tests for invariants; browser integration tests; initial accessibility audit.

**Exit gate:** no known data-loss defect; 1,000-item interaction stays responsive; save-and-close failure injection passes; usable without network/signup.

### Phase 2 — Private alpha hardening

**Goal:** make the local product dependable enough for daily use.

- Notes, autosave status, bulk actions, trash, and recovery history.
- Context-menu capture and optional popup/side-panel quick capture.
- Browser bookmark import and structured migration reports.
- Virtualized lists, indexed search, background compaction, storage dashboard.
- Telemetry consent and privacy-preserving diagnostics (or ship none).
- Automated a11y tests plus manual screen reader and keyboard testing.
- Chromium version/update matrix, service-worker suspension/restart testing.
- Signed reproducible release process and store-listing privacy disclosures.

**Exit gate:** 30 daily users for two weeks, successful export/reimport drills, crash-free target met, all critical accessibility and security findings closed.

### Phase 3 — Optional account and synchronization (public beta)

**Goal:** reliable multi-device continuity without weakening local mode.

- Account creation/login, verified ownership, session and device management.
- Local-to-account merge preview with cancel/backup.
- Operation-log sync, cursors, retries/backoff, tombstones, and compaction.
- Offline two-device conflict handling and a human-readable sync status panel.
- Server tenant isolation, quotas, rate limits, audit events, backup/restore drills.
- Tasks, tags, filters, favorites, and localization foundation.
- Full privacy controls: export, account deletion, device revoke, retention docs.

**Exit gate:** deterministic sync simulation passes randomized operation sequences; no cross-tenant finding; restore-point objective tested; beta users understand conflicts and status.

### Phase 4 — Open-source production release

**Goal:** a maintainable community product, not merely a public repository.

- Stable data/export/API compatibility policy and deprecation process.
- Docker-based self-hosting with health checks, upgrade, rollback, backup, and restore docs.
- Public documentation site, contributor setup under 15 minutes, architecture diagrams.
- Firefox feasibility spike; ship only after parity for required browser APIs.
- Security audit, extension-permission review, accessibility conformance report.
- Governance, maintainer roles, release cadence, support boundaries, roadmap voting.

**Exit gate:** clean install and upgrade tested on supported platforms; recovery drill succeeds; release artifacts and SBOM published; critical docs complete.

### Phase 5 — Sharing and differentiation

**Goal:** expand based on usage evidence rather than reference parity.

- Revocable expiring read-only share links.
- Publishable curated collections with privacy preview.
- End-to-end encrypted hosted sync or a clearly scoped encryption milestone.
- Workspace templates and session snapshots.
- Evaluate collaborative editing, mobile companion, Safari, rules, and local AI only through RFCs and user evidence.

**Exit gate:** each feature has an owner, abuse model, operating-cost estimate, success metric, and removal strategy.

## 9. MVP epics and acceptance scenarios

### Epic A — Safe capture

- Given three ordinary tabs and one pinned tab, selecting “save ordinary tabs and close” persists exactly three links and leaves the pinned tab open.
- If persistence fails or quota is exceeded, no selected tab closes and the user receives a recoverable error.
- Repeating a command after a service-worker restart does not create duplicate items or close unrelated tabs.
- Restricted browser URLs are explained and never passed to an unsafe open handler.

### Epic B — Organize at speed

- A user can create a workspace/group, capture five tabs, reorder them, and move two to another group using pointer or keyboard.
- Reloading or updating the extension preserves entity order and collapsed state.
- A failed transaction restores the visual order and announces the error.

### Epic C — Resume deliberately

- Opening one saved item focuses an already-open matching URL if that policy is enabled.
- Opening a large group requires confirmation and reports individual failures.
- Undo after save-and-close restores the links and browser tabs as closely as supported by the browser.

### Epic D — Find anything

- Search is accent/case tolerant and matches title, hostname, original URL, group/workspace, and note text.
- Results update within 100 ms at p95 on the reference 10,000-item dataset after index readiness.
- Search has a complete keyboard and screen-reader flow.

### Epic E — Own the data

- Export creates a documented, versioned, deterministic JSON file containing all user-created entities and relevant settings.
- Import validates size/schema/URLs, previews creates/updates/skips, and never partially applies without a recovery record.
- An export from the previous supported schema imports through tested migrations.

## 10. Quality strategy

### Test pyramid

- **Unit:** domain invariants, URL normalization, ordering, permissions, reducers, export migrations, merge rules.
- **Property-based:** arbitrary reorders, duplicate/replayed operations, two-device convergence, import round trips.
- **Integration:** IndexedDB transactions/migrations, tRPC authorization, Postgres constraints, browser adapter behavior.
- **Extension E2E:** Playwright with loaded extension for capture, close, restore, update, offline, and service-worker restart.
- **Security:** SAST, dependency/license audit, secret scanning, CSP test, authorization matrix, malicious import corpus.
- **Accessibility:** automated axe-style checks plus manual NVDA/VoiceOver, keyboard, zoom, high contrast, reduced motion.
- **Performance:** 1k/10k/50k fixtures, cold start, search, drag, memory, sync bandwidth, migration duration.
- **Recovery:** corrupted local record, quota exhaustion, interrupted import, stale device, backup restoration, rollback.

### Initial service-level objectives

| Measure | Target |
| --- | --- |
| New-tab usable, warm p75 | < 300 ms on reference hardware |
| New-tab usable, cold p75 | < 1 s |
| Local command acknowledgement p95 | < 100 ms (excluding browser tab creation) |
| Search p95 at 10k items | < 100 ms after index ready |
| Sync convergence | < 10 s after both online under normal load |
| Data-loss incidents | 0; release blocker |
| Crash-free sessions | > 99.9% |

Targets require a documented reference machine and measurement harness; otherwise they are aspirations, not metrics.

## 11. Product metrics without surveillance

Measure locally by default and ask users whether to submit aggregates:

- **Activation:** first successful save-and-close followed by restore within seven days.
- **Reliability:** capture failures, restore failures, migration failures, sync lag/conflicts.
- **Value:** weekly users who save and later reopen an item; number of work contexts resumed.
- **Efficiency:** median actions/time from crowded window to organized/closed tabs.
- **Retention:** opted-in weekly active cohorts, segmented by local-only versus sync.
- **Guardrails:** unexpected closes, undo frequency, import skip rate, storage quota warnings.

Never collect raw URLs, titles, note/task text, workspace names, or exported content in analytics.

## 12. Backlog and dependency order

1. Domain invariants and local migration framework precede UI breadth.
2. Safe single-device capture precedes sync.
3. Export and recovery precede account migration.
4. Sync convergence precedes sharing.
5. Authorization and abuse controls precede public links.
6. Stable protocol and deployment automation precede self-hosting claims.
7. Proven collaboration demand precedes CRDT adoption.
8. Privacy model and explicit consent precede page-content indexing or AI.

Suggested issue labels: `area:extension`, `area:web`, `area:domain`, `area:sync`, `area:security`, `area:a11y`, `area:docs`, `priority:p0..p3`, `status:needs-rfc`, `good-first-issue`, and `blocked-by:*`.

## 13. Decisions required from maintainers

These decisions should become short ADRs before Phase 1 implementation:

1. Project name, license, copyright ownership, and contributor agreement/DCO.
2. Chromium-only MVP versus simultaneous Firefox support.
3. New-tab replacement as mandatory or opt-in dashboard route.
4. Rich text versus plain text for notes (recommend plain text first).
5. Local database library and extension build framework.
6. Hosted sync business/operations owner and expected scale.
7. Whether E2EE is a launch promise; do not imply it unless implemented and reviewed.
8. Anonymous diagnostics policy and which metrics, if any, are worth collecting.
9. Data deletion, trash, tombstone, log, and backup retention periods.
10. AGPL-3.0 versus MPL-2.0 trade-off for self-hosted derivatives.

## 14. Major risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Tab closure before durable save | Severe data loss and trust failure | Transaction-first state machine, failure injection, undo/session recovery |
| MV3 worker suspension | Partial commands and duplicate effects | Idempotent operations, persisted state machine, restart tests |
| Sync complexity | Corruption and prolonged schedule | Ship local-only first, formal merge rules, property/convergence tests |
| Excessive permissions | Store rejection and privacy harm | Progressive optional permissions and documented rationale |
| Large workspaces | Frozen new-tab experience | Indexed storage/search, pagination/virtualization, performance budgets |
| Closed-source imitation | Legal/brand risk and weak differentiation | Clean-room facts, original design/copy/assets, trademark review |
| Self-hosting burden | Unsafe abandoned deployments | Supported version window, migrations, backup docs, health checks |
| E2EE recovery | Irrecoverable user data | Explicit recovery key flow, key rotation design, independent review |
| Untrusted imports/URLs | XSS, resource exhaustion, unsafe navigation | Schema/size limits, sanitization, scheme allowlist, malicious corpus |
| Premature feature breadth | Core workflow remains unreliable | Phase gates, P0 scope, evidence required for P2/P3 |

## 15. Definition of done for every feature

A feature is not done until:

- User behavior and non-goals are documented with acceptance scenarios.
- Domain and authorization rules are enforced below the presentation layer.
- Loading, empty, offline, partial failure, retry, and permission-denied states exist.
- Keyboard, screen reader, zoom, contrast, and reduced-motion behavior are reviewed.
- Unit/integration/E2E coverage matches its risk; data migrations have fixtures.
- Security/privacy impact, logs, permissions, retention, and abuse paths are reviewed.
- Performance is measured against a representative large dataset.
- User docs, export implications, and backward compatibility are updated.
- Telemetry (if any) is content-free, consented, and documented.
- Rollout, rollback, and recovery paths are known.

## 16. Immediate next actions

1. Open a roadmap discussion from this document and invite corrections from existing TabExtend users.
2. Complete the live-product behavior matrix once network/browser access is available.
3. Decide the name, license, browser matrix, and local-only MVP boundary.
4. Write ADRs for extension framework, IndexedDB layer, IDs/order keys, and sync deferral.
5. Turn Phase 0 and Phase 1 into issues with acceptance scenarios, dependencies, and owners.
6. Replace the starter README with project-specific setup, architecture, security, and contribution guidance.
7. Implement one risk-first spike: persist selected tabs, verify, close, restart the MV3 worker, and undo.

