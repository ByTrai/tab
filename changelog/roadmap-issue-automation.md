# Roadmap Issue Automation Handoff

## 1. Summary of changes

- Corrected T0.1, active T1.1, and completed T9.1 ownership to `@tommy`; T0.1 is explicitly blocked on its remaining owner decisions so the roadmap keeps only one active card.
- Added a dependency-free Node.js CLI that parses T-card headings and metadata from `roadmap.md`, previews outstanding issues by default, and creates them through authenticated GitHub CLI only with explicit `--apply`.
- Added stable hidden card markers and an all-state issue lookup so repeated runs do not create duplicates, including when the original issue is closed.
- Added optional card selection, repository targeting, inclusion of completed cards, and explicit roadmap-owner-to-GitHub-login mappings without assuming local aliases are valid GitHub accounts.
- Added focused parser/idempotency tests, npm scripts, and README usage documentation.
- Files affected: `roadmap.md`, `scripts/create-roadmap-issues.mjs`, `scripts/create-roadmap-issues.test.mjs`, `package.json`, `README.md`, and this handoff.

## 2. Testing & validation

- `node --test scripts/create-roadmap-issues.test.mjs` passed both parser and marker tests.
- `node scripts/create-roadmap-issues.mjs --card T1.1` produced the expected dry-run issue for owner `@tommy` without making network changes.
- `node --check scripts/create-roadmap-issues.mjs` passed.
- `node --test apps/extension/test/*.test.js` passed all existing domain and extension tests.
- `git diff --check` passed.
- Security review: dry-run is the default, subprocess arguments are passed without a shell, write access requires both `--apply` and authenticated `gh`, and assignees require explicit mappings. Roadmap content is passed as a single CLI argument rather than evaluated.
- Performance is linear in roadmap size plus at most one GitHub issue-list request and one create request per missing card. The 1,000-issue lookup cap is sufficient for the current roadmap but should become paginated if the project grows beyond it.

## 3. Recommendations for next steps

1. Run `npm run roadmap:issues` and review the preview before the first applied run.
2. Confirm the actual GitHub repository and Tommy's GitHub login, then use `--repo owner/repository --assign tommy=actual-login --apply`.
3. Add repository labels or a GitHub Project integration only after deciding the team's status taxonomy; the roadmap remains authoritative today.
4. If cards begin changing after issue creation, add an explicit `--sync` mode with field ownership rules rather than unexpectedly overwriting human-edited issue bodies.
5. Paginate existing-issue discovery before the repository approaches 1,000 total issues.

## 4. Prompt for next task

```text
Continue Tabby in /workspace/tab. Read roadmap.md, README.md, changelog/roadmap-issue-automation.md, and all AGENTS.md files. Review the dry run from `npm run roadmap:issues`. With the confirmed GitHub repository and Tommy's actual GitHub login, run `npm run roadmap:issues -- --repo OWNER/REPO --assign tommy=LOGIN --apply` to create missing non-done roadmap issues. Verify a second identical run skips every created card. Do not add labels or Project automation until the desired taxonomy is explicitly confirmed. If code changes are needed, add focused tests, update documentation and the mandatory changelog handoff, run all dependency-free test suites plus available quality checks, commit, and open a focused pull request.
```
