# Product Roadmap Task Handoff

## 1. Summary of changes

- Added `roadmap.md`, a full product and engineering plan for an independently designed, open-source tab workspace inspired by TabExtend.
- Documented the product thesis, target users, jobs to be done, non-goals, core workflow, domain model, and prioritized feature inventory.
- Proposed a local-first extension/web architecture that fits the repository's existing Next.js, tRPC, Drizzle, Better Auth, and Postgres foundation.
- Defined phased delivery gates from discovery through local alpha, sync beta, self-hosted production, and optional sharing.
- Added acceptance scenarios, quality and performance targets, privacy/security controls, project risks, architectural decisions, and immediate follow-up actions.
- Explicitly recorded the research limitation: the live reference pages could not be fetched in this environment, so public-product behavior must be validated through a clean-room audit rather than presented as certain.
- Files affected: `roadmap.md` and `changelog/product-roadmap.md`.

## 2. Testing & validation

- Reviewed the current repository structure, package scripts, starter README, Git history, and working tree.
- Attempted live research through the provided web tool; it returned HTTP 401 Unauthorized.
- Attempted direct requests to the reference site and Chrome Web Store; the environment's CONNECT gateway returned HTTP 403.
- Validated documentation structure and reviewed the roadmap for scope, ordering, dependencies, security, privacy, accessibility, performance, recovery, and maintainability concerns.
- No runtime code or dependencies changed, so application unit tests are not directly affected.
- Security review covered extension permission minimization, XSS and unsafe URL schemes, tenant isolation, credential/log leakage, sync replay, malicious imports, supply-chain controls, and share-link abuse.
- Performance review established virtualized rendering, indexed local search, cursor pagination, representative large fixtures, and measurable latency budgets as requirements.

## 3. Recommendations for next steps

1. Validate the reference behavior inventory using the clean-room checklist in `roadmap.md` when live browser access is available.
2. Decide the project name, OSI license, browser support matrix, and whether new-tab replacement is the sole MVP surface.
3. Replace the Create T3 App README with project-specific developer and contributor documentation.
4. Record ADRs for the extension framework, IndexedDB wrapper, fractional ordering, browser adapter, and deferred sync design.
5. Build a risk-first vertical slice for transactional save-and-close plus undo before implementing broad organization features.
6. Add CI checks for formatting, linting, typechecking, tests, builds, dependency/license review, and secret scanning.
7. Do not advertise E2EE, Firefox support, self-hosting stability, or full TabExtend parity until the corresponding exit gates are met.

## 4. Prompt for next task

```text
Continue the open-source tab workspace project in /workspace/tab. Read roadmap.md and changelog/product-roadmap.md first. The repository is currently a Create T3 App baseline using Next.js 15, React 19, tRPC 11, Drizzle/Postgres, Better Auth, Zod, and Tailwind CSS. Implement Phase 0 foundations without implementing sync: choose and document a practical monorepo/extension approach, add the extension skeleton with a browser-API abstraction, and build a risk-first local vertical slice that reads selected current-window tabs, durably persists them in IndexedDB, and only then closes them on explicit “Save and close.” Include idempotency and an undo path that survives an MV3 service-worker restart. Before coding, inspect all AGENTS.md instructions and create ADRs for major choices. Add unit and extension integration tests, run lint/typecheck/build/tests/security checks, update roadmap status, and create the mandatory changelog/{feature}.md handoff. Keep local-only usage account-free and do not request broad host permissions.
```
