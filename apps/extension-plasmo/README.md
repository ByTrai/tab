# Tabby Plasmo parallel shell (T4.1)

**Status:** spike alongside — not over — `apps/extension`  
**Pinned:** `plasmo@0.90.5` (npm)  
**Permission budget:** `tabs` required; `contextMenus` optional (user-gated)

## Why parallel

ADR 0003 requires a reversible migration. The build-free extension in
`apps/extension` remains the production baseline until packaged parity,
storage upgrade, and rollback drills pass.

## Commands

```bash
npm run install:plasmo
npm run build:plasmo
npm run check:plasmo-manifest
```

Load unpacked from `apps/extension-plasmo/build/chrome-mv3-prod` after build.
Daily development and private-alpha distribution still use `apps/extension`.

## What this spike proves

| Check                | Baseline        | Plasmo shell                                       |
| -------------------- | --------------- | -------------------------------------------------- |
| Required permissions | `tabs`          | must equal                                         |
| Optional permissions | `contextMenus`  | may match (user-gated)                             |
| Host permissions     | none            | none                                               |
| New-tab override     | shipped         | packaged entry works                               |
| CaptureService / IDB | production path | **not** wired in spike UI (localStorage demo only) |
| Cutover              | n/a             | blocked until export/import + rollback drills      |

## Explicit non-goals

- No content scripts, remote code, or analytics
- No sync
- No replacing `apps/extension` in README quick start yet
- No claiming store-ready Plasmo packaging until parity tests pass
