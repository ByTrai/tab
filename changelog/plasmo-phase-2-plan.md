# Plasmo and Phase 2 plan

## 1. SUMMARY OF CHANGES

- Accepted a staged, reversible Plasmo adoption in `docs/adr/0003-adopt-plasmo-in-stages.md` based on Tabby's planned multi-surface extension, not unverified assumptions about TabExtend's internals.
- Added `docs/plans/plasmo-and-phase-2.md` with five gated milestones: upstream/baseline evidence, shared contracts and indexed storage, a parallel Plasmo shell, Phase 1 completion/cutover, and Phase 2 private-alpha hardening.
- Updated `roadmap.md` to link the execution plan and explicitly keep synchronization in Phase 3.
- Marked the earlier defer recommendation in `changelog/plasmo-evaluation.md` as superseded while retaining its cautions.
- No dependency, manifest, persisted data, or runtime behavior changed.

## 2. TESTING & VALIDATION

- Ran `git diff --check` and the existing extension unit suite.
- Reviewed the plan against the existing safe-capture ADR, threat model, Phase 1/2 exit gates, and current extension boundaries.
- Security planning includes generated permission/CSP comparison, dependency pinning/review, remote-code prohibition, SBOMs, secret/license/vulnerability scans, privacy-safe logs, and rollback testing.
- Performance gates cover package/startup cost plus 1k/10k/50k storage, search, migration, memory, and transaction measurements.
- Current Plasmo release health could not be verified because outbound web access was unavailable. Official upstream verification is Milestone 0 and blocks dependency selection.

## 3. RECOMMENDATIONS FOR NEXT STEPS

1. Execute only Milestone 0 first and record actual Plasmo version/toolchain evidence before changing `package.json`.
2. Assign owners and capacity before attaching dates; preserve evidence-based gates rather than promising reference-product parity.
3. Treat legacy IndexedDB upgrade and rollback as release blockers, not post-migration cleanup.
4. Keep sync, broad permissions, and content scripts out of the migration to avoid combining independent high-risk changes.

## 4. PROMPT FOR NEXT TASK

> Execute Milestone 0 of `docs/plans/plasmo-and-phase-2.md` in `/workspace/tab`. Read ADRs 0002 and 0003, the local threat model, and the current `apps/extension` implementation first. Verify the latest official Plasmo docs and release activity; pin no dependency until compatibility is established. Make the existing loaded-extension Playwright suite runnable, baseline the unpacked manifest/CSP/permissions/package files/IndexedDB identity/startup/capture/undo behavior, and add restart checkpoints around journal transitions. Produce an evidence report and an adopt/amend/reject recommendation. Do not replace the extension, change persisted data, add permissions, content scripts, telemetry, or sync. Run all available checks and add the mandatory changelog handoff.
