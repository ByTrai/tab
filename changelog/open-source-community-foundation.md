# Open-Source Community Foundation Handoff

## 1. Summary of changes

- Added the standard MIT License with a 2026 copyright notice attributed to Tabby contributors.
- Added a concise Code of Conduct covering expected behavior, prohibited conduct, scope, private reporting, proportionate enforcement, confidentiality, and protection from retaliation.
- Added a contribution guide covering setup, roadmap ownership, architecture and privacy boundaries, validation, required changelog handoffs, pull-request expectations, and private security reporting.
- Updated the README with direct license, contribution, and conduct links while accurately retaining unresolved public-release blockers.
- Updated roadmap card T0.1 to show the governance work is in progress and separate completed community files from remaining security/governance work.
- Files affected: `LICENSE`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `README.md`, `roadmap.md`, and `changelog/open-source-community-foundation.md`.

## 2. Testing & validation

- Ran `git diff --check` to detect whitespace errors.
- Ran the extension unit/contract test suite to ensure the branch baseline remains healthy.
- Validated all relative Markdown links in the changed documentation.
- Scanned the changed files for common credential/private-key patterns and found no secrets.
- Security review kept vulnerability and conduct reporting private without inventing a public email address that the maintainers have not approved.
- These documentation-only changes do not affect runtime behavior, bundle size, browser permissions, persisted data, or performance.

## 3. Recommendations for next steps

1. Confirm that “Tabby contributors” is the desired MIT copyright holder before the first public release; replace it with the legal owner if required.
2. Publish `SECURITY.md` with an actively monitored private contact or enable the hosting provider's private vulnerability-reporting feature.
3. Decide whether contributions use a Developer Certificate of Origin, a CLA, or neither, and document that decision.
4. Add issue and pull-request templates after the maintainers confirm labels and review responsibilities.
5. Complete the name/trademark check before publishing packages, domains, extension listings, or final landing-page copy.

## 4. Prompt for next task

```text
Continue Tabby in /workspace/tab by completing the remaining security-policy portion of roadmap card T0.1. Read README.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, LICENSE, roadmap.md, docs/threat-model/local-alpha.md, all applicable AGENTS.md files, and changelog/open-source-community-foundation.md first. Add a concise SECURITY.md that defines supported versions, an actively monitored private reporting method supplied or approved by the project owner, what details a useful report should contain without exposing private browsing data, acknowledgment/remediation expectations, coordinated disclosure, and explicit exclusions for public exploit reports. Do not invent an email address; if no private contact has been configured, document the exact owner decision needed rather than publishing a nonfunctional channel. Update the README and T0.1 status, run documentation link/whitespace/secret checks plus existing tests, and create the mandatory changelog/security-policy.md handoff. Commit the work and open a focused pull request.
```
