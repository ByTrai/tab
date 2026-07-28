# Quality Baseline Handoff

## 1. Summary of changes

- Replaced the obsolete `next lint` commands with direct ESLint flat-config commands and made warnings fail CI.
- Added a composite quality command covering formatting, linting, type checking, extension tests, the extension privilege baseline, and production dependency licenses.
- Added pull-request and `main` CI for the quality suite, dependency audit, production build, and Gitleaks history scan with read-only repository permissions and bounded timeouts.
- Added Node 20/npm 10 policy metadata and pinned Better Auth to the compatible 1.3.0 baseline instead of allowing an unbounded caret upgrade into incompatible 1.6 peer requirements.
- Added fail-closed scripts that detect unexpected extension permissions/privileged manifest keys and missing or restricted production dependency license metadata.
- Updated the contributor checks in `README.md` and marked roadmap card T9.1 done.
- Files affected: `.github/workflows/quality.yml`, `.nvmrc`, `README.md`, `eslint.config.js`, `package.json`, `roadmap.md`, `scripts/check-extension-manifest.mjs`, `scripts/check-licenses.mjs`, and this handoff.

## 2. Testing & validation

- `node --test apps/extension/test/*.test.js` passed all eight contract and safe-capture tests.
- `node scripts/check-extension-manifest.mjs` passed against the current tabs-only MV3 manifest.
- `git diff --check` passed.
- Dependency installation, full formatting/lint/typecheck/build, dependency audit, and license validation could not run locally because the environment registry proxy returned HTTP 403 for required package tarballs. CI now executes these checks in a normal registry environment.
- Security validation added least-privilege workflow permissions, secret-history scanning, high-severity production dependency auditing, restricted-license detection, and a fail-closed extension permission/CSP baseline.
- Performance impact is limited to CI/developer tooling; no runtime application or extension path changed. CI jobs have explicit timeouts and npm caching.

## 3. Recommendations for next steps

1. Merge only after CI confirms that Better Auth 1.3.0 and the existing Drizzle versions install, typecheck, and build together; commit an npm lockfile from a registry-enabled environment to make installs reproducible.
2. Pin third-party GitHub Actions to reviewed commit SHAs as a supply-chain hardening follow-up.
3. Decide whether license policy should permit specific weak-copyleft packages before adding any; exceptions should be documented rather than silently widening the rule.
4. Add a reviewed `SECURITY.md` disclosure channel under T0.1 and configure branch protection to require both CI jobs.
5. Continue with T1.1 after the remaining T0.1 terminology decision, or T7.1 in parallel within its documentation-only touch set.

## 4. Prompt for next task

```text
Continue Tabby in /workspace/tab from completed roadmap card T9.1. Read roadmap.md, README.md, changelog/quality-baseline.md, docs/adr/**, and all AGENTS.md files first. Use a registry-enabled environment to run npm install and commit package-lock.json, then run npm run check, npm run audit:dependencies, and SKIP_ENV_VALIDATION=1 npm run build. Resolve failures without relaxing the tabs-only manifest or license/security policies, and verify Better Auth 1.3.0 against the existing Drizzle types. If the baseline is green, implement T1.1 canonical local workspace contracts with versioned fixtures, deterministic import/export, malicious-input limits, UTC timestamp semantics, client-generated IDs, ordering semantics, and migrations for current web schema v1 plus extension journal v1/v2. Do not add UI, browser permissions, sync, or framework dependencies. Update roadmap status and create the mandatory changelog/domain-model.md handoff, then commit and open a focused pull request.
```
