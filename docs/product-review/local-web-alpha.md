# Local web alpha product review

**Reviewed:** 2026-07-26  
**Method:** static interaction/code review; runtime visual review remains pending because dependencies and a browser runtime were unavailable.

## What is ready for review

The web alpha establishes a clear local-only promise, a usable link/note/task quick-add path, persistent workspaces and groups, broad local search, JSON portability, responsive styling, and explicit save status. These choices are consistent with the assumed Phase 0 jobs without pretending interviews occurred.

## Findings

| Severity | Finding                                                                                                            | Recommended action                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| High     | Delete is immediate and has no undo/trash, conflicting with the roadmap's no-loss principle.                       | Add tombstoned trash and an undo toast before broader alpha use.                              |
| High     | `window.prompt` is used to name workspaces/groups and provides weak validation, focus, and screen-reader behavior. | Replace it with an accessible dialog and inline validation.                                   |
| High     | Drag handles and group overflow controls appear interactive but do nothing.                                        | Implement keyboard/pointer movement and group actions, or remove the affordances until ready. |
| Medium   | Quick-add always targets the first group, which becomes surprising once multiple groups exist.                     | Add an explicit destination picker and remember the last destination locally.                 |
| Medium   | The narrow sidebar hides inactive workspaces, reducing workspace discoverability.                                  | Add a mobile workspace switcher rather than hiding navigation choices.                        |
| Medium   | Theme preference is not persisted and does not initially honor the system setting.                                 | Store the preference and use `prefers-color-scheme` by default.                               |
| Medium   | Search is linear across arrays and repeatedly resolves parents.                                                    | Create indexed entity stores and a prepared search index before the 10,000-item gate.         |
| Low      | The avatar and keyboard-hint affordance do not perform their suggested actions.                                    | Remove them or add profile/help and an actual command/search shortcut.                        |

## Release recommendation

Use the web alpha as a concept and architecture review surface, not a daily-use alpha, until immediate delete and misleading controls are fixed. The new extension safe-capture slice should be manually tested independently; it intentionally does not inherit these incomplete organization affordances.
