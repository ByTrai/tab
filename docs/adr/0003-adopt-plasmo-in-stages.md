# ADR 0003: Adopt Plasmo in stages

**Status:** accepted, implementation gated
**Date:** 2026-07-26

## Context

The hand-written Manifest V3 extension proves the highest-risk capture sequence with a minimal dependency and permission surface. The product roadmap, however, calls for a richer new-tab workspace followed soon by popup, side-panel, options, context-menu, shared UI, and eventually additional browser packaging. Maintaining entry points, manifests, React bundling, development reload, and packaging by hand will become recurring product work.

Choosing tooling before that surface area arrives reduces a later all-at-once migration. It does not remove the more urgent need to unify the web and extension contracts, normalize IndexedDB, or preserve service-worker restart safety. Public descriptions of a reference product are not evidence of its implementation or scale, so this decision is based on Tabby's planned requirements rather than assumptions about TabExtend's internals.

Current upstream documentation and release health could not be checked from this environment. Dependency version selection is therefore an explicit implementation gate rather than being fixed in this ADR.

## Decision

Adopt Plasmo as the planned extension application/build framework through a reversible, test-first migration. Keep domain commands, URL rules, repository interfaces, migrations, and the capture state machine in framework-independent modules. Keep browser calls behind an adapter.

Migration proceeds in four gates:

1. **Toolchain spike:** pin a reviewed Plasmo version, reproduce the current new-tab and service-worker entry points, and inspect generated artifacts. Do not replace the working extension.
2. **Behavioral parity:** run the existing unit suite and loaded-extension tests against both packages. Generated permissions must not exceed the current `tabs` permission, and persistence-before-close, pinned-tab handling, idempotency, restart recovery, and undo must remain equivalent.
3. **Cutover:** switch the development and release package only after export/import compatibility and rollback to the prior extension are demonstrated. Preserve the extension ID and IndexedDB origin in the real release path or provide and test an explicit migration.
4. **Phase 2 surfaces:** add popup, side panel, options, and context-menu capture incrementally. Request optional permissions only at the feature boundary that needs them.

Do not add content scripts, broad host permissions, remote code, analytics, or synchronization as part of the framework migration. Do not couple persisted schemas to Plasmo APIs.

## Consequences

The project accepts a larger dependency and supply-chain surface in exchange for standardized entry points, shared React UI tooling, and packaging as the extension grows. Lockfiles, dependency review, artifact inspection, CSP checks, reproducible builds, and an SBOM become release requirements.

The migration has a deliberate period of two implementations. This costs short-term effort but provides a measurable rollback path around the product's no-data-loss workflow. If the spike fails the permission, CSP, storage-origin, service-worker, package-health, or parity gates, ADR 0003 must be amended or superseded and the hand-written extension remains authoritative.
