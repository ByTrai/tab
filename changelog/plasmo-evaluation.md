# Plasmo evaluation

## 1. SUMMARY OF CHANGES

- Evaluated whether the current dependency-free Manifest V3 extension in `apps/extension` should migrate to Plasmo.
- Initial recommendation: **do not migrate immediately**. This recommendation is superseded by ADR 0003's staged adoption plan now that popup/side-panel surfaces and Phase 2 hardening are being scheduled. The architectural cautions remain applicable.
- Plasmo adoption must still begin with a proof of concept that preserves the capture transaction and restart-safe operation journal; it is not permission to rewrite domain behavior into framework components.
- No runtime behavior was changed. File added: `changelog/plasmo-evaluation.md`.

## 2. TESTING & VALIDATION

- Inspected `apps/extension/manifest.json`, `core.js`, `background.js`, `browser-adapter.js`, `repository.js`, and the extension tests.
- Ran `git diff --check` successfully.
- Attempted to verify the current Plasmo documentation and repository status, but outbound web access was unavailable in this environment; package health, Manifest V3 support details, and current browser targets must be verified before adoption.
- Security consideration: retaining the current implementation keeps the dependency and supply-chain surface minimal. A Plasmo proof of concept must compare generated permissions, content security policy, packaged files, and remote-code behavior against the hand-written manifest.
- Performance consideration: framework overhead is unlikely to dominate a new-tab UI, but bundle size, cold start, and service-worker behavior should be measured rather than assumed.

## 3. RECOMMENDATIONS FOR NEXT STEPS

1. First extract shared domain contracts and URL normalization for the web and extension; this delivers more value and reduces drift regardless of extension framework.
2. Keep the capture service and repository interfaces independent of Plasmo, React, and `chrome.*` so a future migration remains reversible.
3. If additional extension surfaces are approved, build a time-boxed Plasmo spike on a separate branch and compare developer experience, packaged permissions, bundle size, cold-start time, testability, and Firefox/Chromium output.
4. Adopt Plasmo only if the spike demonstrates a meaningful maintenance advantage without weakening persistence-before-close and restart recovery guarantees.

## 4. PROMPT FOR NEXT TASK

> In `/workspace/tab`, create a time-boxed Plasmo proof of concept for `apps/extension` without replacing the production extension. Preserve the behavior and interfaces in `apps/extension/core.js`, `browser-adapter.js`, and `repository.js`; reproduce the new-tab and service-worker entry points; and compare generated manifest permissions/CSP, packaged size, cold-start behavior, test ergonomics, Chromium/Firefox targets, and restart-safe capture/undo behavior. Verify the latest official Plasmo documentation and release health first. Document an evidence-based adopt/reject decision in an ADR and add the required changelog handoff.
