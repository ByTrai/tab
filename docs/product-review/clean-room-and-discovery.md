# Clean-room reference and user discovery (T0.2)

**Status:** documented product decisions for private alpha  
**Rule:** TabExtend is workflow inspiration only — no copied code, copy, assets, or private APIs.

## Public workflow inventory (observation category only)

Observed category behaviors common to visual tab organizers (not implementation claims about any specific product):

| Workflow                    | User job                                  | Tabby stance                                                 |
| --------------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| Capture current tabs        | Park a set of ordinary web pages          | Shipped (extension capture, HTTP(S) only)                    |
| Close after save            | Clear browser clutter without losing work | Shipped (persist-before-close)                               |
| Organize into groups        | Resume by project/context                 | Shipped (web + extension workspaces/groups)                  |
| Notes / light tasks         | Keep intent next to links                 | Shipped (local notes/tasks)                                  |
| Search local library        | Find parked work quickly                  | Shipped (title/url/content search)                           |
| Backup / restore            | Survive profile wipe                      | Shipped (export schema v2 + dry-run import)                  |
| Sync across devices         | Continue elsewhere                        | **Rejected for alpha** — Gate D only after local reliability |
| Share boards publicly       | Collaborate / publish                     | **Rejected** until abuse model + evidence (T8.3)             |
| AI classify tabs            | Auto-file                                 | **Rejected** — no content indexing/telemetry                 |
| Full-page clip / host perms | Rich capture                              | **Rejected** — no content scripts / host permissions         |

## Activation & reliability measures (no content telemetry)

- **Activation:** first successful capture with ≥1 tab saved, or first web workspace item created.
- **Reliability:** zero acknowledged-but-missing captures; recoverInterrupted covers `saved`+close / `closing` / `undoing`.
- **Backup health:** export → clear profile → import drill succeeds (see user guide).
- Never measure raw URLs, titles, notes, or export bodies.

## Interview plan (to run with consenting users)

Target 8–12 tab-heavy users. Script:

1. How do you currently park research / shopping / work tabs?
2. When did a tab organizer last lose your work?
3. Would you accept “local only, export yourself” for privacy?
4. Rank: sync, sharing, notes, restore-all, keyboard speed.

Until interviews complete, private-alpha decisions follow the table above and the threat model in `docs/threat-model/local-alpha.md`.

## P0 / P1 feature links

| Priority | Feature                            | Evidence / decision                       |
| -------- | ---------------------------------- | ----------------------------------------- |
| P0       | Persist-before-close capture       | Reliability requirement; ADR 0002         |
| P0       | Local organize + export            | Alpha activation path                     |
| P0       | Restart recovery                   | MV3 worker reality                        |
| P1       | Notes/tasks, popup, dry-run import | Same job-to-be-done expansion             |
| P2       | Plasmo shell                       | Tooling, not user value (ADR 0003)        |
| Deferred | Sync / share / AI                  | Explicit rejects until gates + interviews |
