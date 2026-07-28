# Senior review — performance, security, best practices

## 1. Summary of changes

Reviewed Tabby against the TabExtend-like local-first private-alpha goal (save → organize → restore, offline, no sync yet). Applied hardening and quality fixes in this pass:

- Dependabot better-auth / drizzle-orm advisories closed via `better-auth@^1.6.25` and `drizzle-orm@^0.45.2`; lockfile committed; unused `@auth/drizzle-adapter` removed.
- Auth scaffold: GitHub OAuth only, `BETTER_AUTH_URL` + `trustedOrigins`, `session.cookieCache` disabled, hardcoded localhost callback removed.
- Domain commands (`applyCommand`) + `@tabby/local-store` entity repository foundations; extension organize/restore/recovery; web `/` landing + `/app` workspace convergence; soft trash; export schema v2.
- License checker skips workspace link stubs; production audit policy blocks advisories on pinned runtime packages without forcing unsafe Next downgrades.
- Web search uses Map lookups (O(n) vs O(n×relationships)).
- `SECURITY.md` and GitHub issue/PR templates added.

## 2. Findings and status

| Area          | Finding                                                             | Status                                                                                           |
| ------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Security      | better-auth + drizzle-orm GHSA set from Dependabot                  | **Fixed** (upgrade)                                                                              |
| Security      | Email/password + hardcoded OAuth redirect                           | **Fixed**                                                                                        |
| Security      | Legacy capture URLs re-opened without re-validation                 | **Fixed** in extension open/restore/undo paths                                                   |
| Security      | Soft-delete vs immediate hard delete on web                         | **Fixed** (trash + restore)                                                                      |
| Security      | Missing private disclosure channel                                  | **Fixed** (`SECURITY.md`)                                                                        |
| Security      | Transitive `sharp` (Next) / `esbuild` (drizzle-kit via better-auth) | **Fixed** — `sharp@0.35.3` override; stub unused `@esbuild-kit/esm-loader` (`npm audit --omit=dev` clean) |
| Perf          | Whole-aggregate IDB writes on web                                   | **Mitigated path** — entity store package ready; web still flat document until full T2.1 cutover |
| Perf          | Web search nested finds                                             | **Fixed** (Maps)                                                                                 |
| Perf          | Extension capture journal still whole-state put                     | **Open** — entity store used for organize; journal migration remaining                           |
| Best practice | Fake ⌘K / avatar / drag affordances                                 | **Removed** on web                                                                               |
| Best practice | Manifest still `tabs` only                                          | **Preserved**                                                                                    |
| Best practice | Plasmo parallel shell (T4.1)                                        | **Deferred** — build-free extension enhanced for testability first                               |
| Best practice | No E2E in CI / no 1k–50k perf matrix                                | **Open** (T9.2)                                                                                  |

## 3. Testing & validation

- `node --test apps/extension/test/*.test.js` — 30 passing
- `SKIP_ENV_VALIDATION=1 npm run typecheck`
- `npm run lint`, `check:manifest`, `check:licenses`, `audit:dependencies`
- `SKIP_ENV_VALIDATION=1 npm run build` (run in this pass)

## 4. Recommendations for next steps

1. Cut web IndexedDB over to `@tabby/local-store` EntityRepository with fixture migration drills (finish T2.1).
2. Wire Playwright extension E2E into CI with worker-termination checkpoints (T9.2).
3. Add Plasmo parallel shell only after organize/restore private-alpha feedback (T4.1).
4. Revisit removing the `sharp` / `@esbuild-kit` overrides once Next and drizzle-kit publish patched dependency trees.
5. Do not enable better-auth plugins (api-key, oidc, mcp, organization) without a dedicated threat-model review.

## 5. Prompt for next task

```text
Continue Tabby private-alpha hardening. Cut src/lib/workspace-store.ts over to @tabby/local-store EntityRepository with backup/export-before-upgrade, add Playwright newtab E2E to CI with recoverInterrupted coverage, and measure 1k-item search/startup budgets. Do not start sync (T8) or broaden extension permissions.
```
