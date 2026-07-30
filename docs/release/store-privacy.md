# Store permission and privacy disclosure (draft)

Use this text when submitting a Chromium store listing. Do not publish until legal review.

## Permission: `tabs`

**Why:** Read the current window’s tab URL/title to offer save/close/restore of ordinary HTTP(S) pages.  
**Not used for:** Reading page HTML, injecting scripts, or collecting browsing history beyond the user-selected capture.

## Optional permission: `contextMenus` (if enabled by user)

**Why:** Add a “Save to Tabby” item on link/page context menus. Requested only when the user enables the feature.  
**Not used for:** Broad site access.

## Data storage

- Workspace and capture data stay in extension / site IndexedDB on the user’s device.
- No account required for local alpha features.
- No analytics that include URLs, titles, notes, or exports.

## Remote code

Tabby does not execute remotely hosted extension code.
