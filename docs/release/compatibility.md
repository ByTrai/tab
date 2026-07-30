# Compatibility and deprecation

| Surface                                   | Supported                                   | Notes                                    |
| ----------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| Chromium new-tab + popup (unpacked / zip) | Chrome, Edge, Brave, Chromium recent stable | Manifest V3, permission `tabs`           |
| Plasmo parallel shell                     | Dev/spike only                              | Not production baseline                  |
| Web `/` + `/app`                          | Modern evergreen browsers                   | IndexedDB required                       |
| Firefox                                   | Not shipped                                 | Capability adapter may fail closed later |
| Export schema                             | v1 (read), v2 (read/write)                  | Unknown versions fail closed             |
| Soft trash                                | 30-day retention                            | Purged on load                           |

## Deprecation policy

- Breaking persisted-schema changes require a migration fixture, changelog entry, and at least one prior-version import path.
- Removing a permission requires a major version and store disclosure update.
- Plasmo cutover requires ADR 0003 gate sign-off and a rollback zip of the prior baseline.
