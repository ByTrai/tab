# File tree

```text
tab/
├── apps/
│   └── extension/             # Chromium Manifest V3 extension
│       ├── e2e/               # Browser-level tests
│       └── test/              # Extension unit tests and fakes
├── changelog/                 # Task handoff records
├── docs/
│   ├── adr/                   # Architecture decision records
│   ├── product-review/        # Product review notes
│   └── threat-model/          # Security and privacy analysis
├── public/                    # Static web assets
├── src/
│   ├── app/
│   │   ├── _components/       # Next.js UI components
│   │   └── api/               # Auth and tRPC route handlers
│   ├── lib/                   # Workspace domain and IndexedDB storage
│   ├── server/
│   │   ├── api/               # tRPC context and routers
│   │   ├── better-auth/       # Authentication configuration
│   │   └── db/                # Drizzle connection and schema
│   ├── styles/                # Global web styles
│   └── trpc/                  # Web tRPC clients/providers
├── .env.example               # Environment variable template
├── drizzle.config.ts          # Database migration configuration
├── next.config.js             # Next.js configuration
├── package.json               # Dependencies and scripts
├── README.md                  # Setup and architecture overview
├── roadmap.md                 # Product and engineering roadmap
└── tsconfig.json              # TypeScript configuration
```

## 1. SUMMARY OF CHANGES

- Added a concise, annotated top-level file tree; no runtime code changed.
- File affected: `changelog/file-tree.md`.

## 2. TESTING & VALIDATION

- Verified the tree against the repository with `find`.
- Ran `git diff --check` successfully.
- No runtime, security, or performance behavior changed.

## 3. RECOMMENDATIONS FOR NEXT STEPS

- Use `src/lib` for framework-independent workspace behavior and avoid adding domain logic directly to UI components.
- Extract shared web/extension contracts into packages when the two clients are integrated.

## 4. PROMPT FOR NEXT TASK

> Review the Tabby repository using `changelog/file-tree.md` as the directory map. Focus next on consolidating the duplicated web and extension domain/storage contracts in `src/lib` and `apps/extension`, while preserving existing IndexedDB data and adding compatibility tests.
