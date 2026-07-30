# Contributor setup verification (≤15 minutes)

Verified on this repository's CI Node version (see `.nvmrc`). Goal: a new contributor can run the local web app and extension tests without maintainer help.

## Drill checklist

| Step               | Command / action                                       | Expected                                        |
| ------------------ | ------------------------------------------------------ | ----------------------------------------------- |
| 1. Clone & install | `npm install`                                          | Completes without errors                        |
| 2. Env file        | `cp .env.example .env`                                 | File present; placeholders OK for local UI      |
| 3. Typecheck       | `SKIP_ENV_VALIDATION=1 npm run typecheck`              | Exit 0                                          |
| 4. Unit tests      | `npm run test:extension`                               | All tests pass                                  |
| 5. Manifest policy | `npm run check:manifest`                               | Permissions remain `["tabs"]`                   |
| 6. Dev server      | `SKIP_ENV_VALIDATION=1 npm run dev`                    | http://localhost:3000 landing; `/app` workspace |
| 7. Extension load  | Chrome → Extensions → Load unpacked → `apps/extension` | New tab + toolbar popup open                    |

Optional (longer): `SKIP_ENV_VALIDATION=1 npm run build`, `xvfb-run -a npm run test:e2e:extension`, `npm run bench:local-store`.

## Timing target

Steps 1–5 should complete in **under 15 minutes** on a typical developer laptop with cached npm. If install exceeds that, check Node 20/22 and npm 10 (see `package.json` `engines`).

## Troubleshooting

| Symptom                             | Fix                                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| Env validation blocks `dev`/`build` | Use `SKIP_ENV_VALIDATION=1` for local-only UI work                                |
| Extension blank / no worker         | Reload the unpacked extension after file changes                                  |
| Import rejected                     | Export must be schema v1 or v2 JSON; see `docs/user-guide/backup-and-recovery.md` |
| Permission surprise                 | Do not add host permissions; `check:manifest` fails CI                            |

## Sign your commits (DCO)

```bash
git commit -s -m "Your message"
```

See [CONTRIBUTING.md](../CONTRIBUTING.md).
