# Topic-Based Roadmap and README Handoff

## 1. Summary of changes

- Replaced the phase-only roadmap with a remaining-work board organized into product/governance, domain contracts, local storage, browser platform, extension, accessibility/design, web convergence, landing/docs, hosted sync, and quality/release topics.
- Added assignable card IDs, `@owner` placeholders, statuses, dependencies, touch sets, definitions of done, cross-topic gates, conflict rules, a two-developer sequence, and an immediate `@tommy`/`@romeo` assignment proposal.
- Added a dedicated landing-page stream inspired by the TabExtend product category while requiring original branding, copy, assets, information architecture, truthful claims, privacy-safe measurement, accessibility, and performance validation.
- Rewrote the README for an upcoming open-source audience with current capabilities and limitations, web and extension setup, optional database/auth setup, environment variables, repository structure, architecture boundaries, workflow, checks, testing expectations, and security/contribution warnings.
- Explicitly documented the existing obsolete `next lint` script as quality debt rather than claiming it works.
- Files affected: `README.md`, `roadmap.md`, and `changelog/topic-based-roadmap-and-readme.md`.

## 2. Testing & validation

- Attempted Prettier validation; it could not start because dependencies are not installed and the configured `prettier-plugin-tailwindcss` package is unavailable in the environment. Used `git diff --check` to validate whitespace instead.
- Ran the extension Node test suite to ensure documentation changes did not coincide with a broken safe-capture/contracts baseline.
- Reviewed the documented paths, root scripts, environment schema, extension manifest, ADRs, and staged Plasmo plan against the repository contents.
- Reviewed security implications: secret handling, untrusted URL/import data, MV3 permission growth, remote code, raw-content telemetry/logging, marketing claim accuracy, and private disclosure readiness.
- No runtime code or dependency changed, so no application performance behavior changed. The roadmap retains explicit performance fixtures, reference hardware, and release budgets.

## 3. Recommendations for next steps

1. Assign T0.1 and T9.1 to the two developers (or swap owners based on expertise) and add PR links/status directly to their cards.
2. Resolve the project name, license, private security contact, and contribution model before publishing or implementing final landing copy.
3. Replace `next lint` with direct ESLint invocation and establish a green CI baseline before the Plasmo dependency/toolchain work.
4. Freeze the canonical domain/command boundaries before either developer expands the extension or refactors the web app.
5. Choose the `/` landing versus `/app` workspace routing strategy before landing implementation to avoid conflicts in the root Next.js layout and page.
6. Treat existing browser profiles and exports as production-like data: every persisted-shape change needs fixtures, migration, rollback, and export recovery.

## 4. Prompt for next task

```text
Continue Tabby in /workspace/tab by implementing roadmap card T9.1, “Repair and enforce the quality baseline.” Read README.md, roadmap.md, all docs/adr files, docs/plans/plasmo-and-phase-2.md, and any AGENTS.md first. Replace the obsolete Next.js `next lint` scripts with direct ESLint commands compatible with the existing flat config, add a documented Node/npm version policy, and add focused CI checks for formatting, lint, typecheck, extension tests, and production build. Add dependency/license and secret checks only after evaluating false-positive handling and maintenance cost; do not change feature UI, persisted schemas, extension permissions, or product copy. Run every updated check, document environment-only limitations accurately, update T9.1 status, and create the mandatory changelog/quality-baseline.md. Preserve local-only operation and commit the changes with a focused pull request.
```
