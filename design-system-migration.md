# Design system migration

Applies the `design-kit/` design system (near-monochrome, square, technical/editorial)
consistently across the marketing site, the workspace app, and the browser extension.

## Files reviewed

- `design-kit/README.md`, `SOURCE.md`, `DESIGN_SYSTEM.md`, `component-inventory.md`,
  `evidence.md`, `tokens.css`, `tokens.json`
- `.extract-design-kit/raw.json`, `normalized.json`, `verification.md`
- `src/styles/tokens.css`, `src/styles/globals.css`, `src/app/layout.tsx`
- `src/app/page.tsx`, `src/app/app/page.tsx`
- `src/app/_components/landing-page.tsx`
- `src/app/_components/workspace-app.tsx`
- `src/app/_components/post.tsx` (unused scaffold component, not routed anywhere)
- `apps/extension/newtab.html`, `newtab.css`, `newtab.js`, `manifest.json`
- `apps/extension/background.js`, `browser-adapter.js`, `core.js`, `repository.js` (read for
  context; no CSS classes or styling logic live there)

No files existed under `src/components/`.

## Files changed

- `src/styles/tokens.css` — replaced with a single semantic token set (light `:root` +
  `.dark`/`.app-shell.dark` overrides) mirroring `design-kit/tokens.css`: `--background`,
  `--foreground`, `--surface`, `--subtle`, `--muted`, `--border`, `--focus`, `--danger`,
  the three-role font stack, `--radius: 0`, spacing, and motion tokens. Legacy variable
  names (`--paper`, `--line`, `--shadow`, etc.) are kept as aliases so nothing else needed
  a rename, and reduced-motion handling now lives in one place.
- `src/styles/globals.css` — rewritten. The previous version defined a full visual system
  and then re-declared ~40 rules at the bottom of the file as an "override layer" to force
  square corners/mono labels on top of the original teal/rounded/gradient styles. That
  patch layer is gone; every rule for the workspace app (sidebar, topbar, search, quick-add,
  kind tabs, item cards, empty states, settings popover, dialogs) and the landing page (nav,
  hero, sections, footer) is now written once, directly against the semantic tokens.
  - Buttons: square, uppercase, `Geist Mono`, thin border or ink/on-ink contrast for primary
    actions, per `component-inventory.md`.
  - Inputs/search: bottom-rule style, no border box, focus switches the rule to `--focus`.
  - Cards/groups/rows: 1px borders, no radius, no shadows; the settings popover and dialog
    keep a small hard offset (`box-shadow: Npx Npx 0 var(--shadow)`) instead of a blurred
    elevation shadow, consistent with "borders instead of elevation."
  - Empty states use a dashed border box (`component-inventory.md`: "Empty states use
    dashed boundaries").
  - Dark mode consumes `.app-shell.dark` tokens from `tokens.css` instead of a second,
    partially-conflicting hardcoded block.
  - Landing hero/mock and section styling dropped the radial gradients, backdrop blur,
    pill-shaped nav CTA/buttons, and floating-tab keyframe animations; it now uses the
    ink/on-ink contrast pattern, square nav CTA, and static bordered composition.
- `src/app/_components/landing-page.tsx` — removed the decorative `hero-atmosphere` div and
  the `hero-tab-dot`/`float-*` classes that no longer have styling (their gradient/motion
  rules were removed); no copy, links, or structure changed.
- `src/app/_components/post.tsx` — swapped `rounded-full` Tailwind utilities for
  `rounded-none` + a bordered/uppercase treatment so the one leftover scaffold component
  (unrouted, not part of any page) doesn't contradict the square-corner rule if it's ever
  wired up.
- `apps/extension/newtab.css` — full restyle to the same semantic system: monochrome
  palette, square corners, thin borders, bottom-rule search input, uppercase mono buttons,
  dashed/plain empty states, hard-offset toast/panel treatment instead of blurred shadows,
  and the gradient background/backdrop-blur/rounded pill removed. No changes to
  `newtab.html` markup or `newtab.js` behavior — only the CSS selectors they already target.
- `src/app/layout.tsx` — no logic change; reformatted by Prettier (line wrap) as part of the
  standard `format:write` run.
- Minor Prettier reformatting only (no content change) touched `.extract-design-kit/*.json`,
  `design-kit/component-inventory.md`, `design-kit/evidence.md`, `design-kit/tokens.json`,
  and `changelog/senior-review-private-alpha.md` — these were already tracked files that
  weren't previously run through the project's Prettier config.

No React component logic, routes, storage/IndexedDB behavior, extension messaging, or
accessibility attributes (`aria-*`, roles, labels) were changed. Class names referenced by
`workspace-app.tsx`, `landing-page.tsx`, `newtab.html`, and `newtab.js` were preserved so no
markup/JS coupling broke.

## Design-system decisions beyond the kit

- **Extension fonts**: the kit specifies Outfit / Nunito Sans / Geist Mono, loaded via
  `next/font` in the Next.js app. The extension's `newtab.html` is a static page with no
  bundler and the product is local-first/privacy-first, so it intentionally does not fetch
  Google Fonts at runtime. It uses system font stacks (`ui-sans-serif`/`system-ui` for body
  and headings, `ui-monospace` for metadata) to keep the same three-role hierarchy and
  typographic rhythm without an added network dependency.
- **Item-kind badges**: the previous UI colored link/note/task icons with teal/amber/green
  hues. Per "near-monochrome... avoid saturated accent colors," these badges are now neutral
  (`--subtle` background, `--foreground` text, thin border); the kind is still conveyed by
  the glyph/label and layout, not hue.
- **Workspace color dots**: `WORKSPACE_COLORS` (user-facing identity color per workspace) is
  functional data, not decorative chrome, so it's preserved as-is; only its corner radius was
  squared off to keep it consistent with "no rounded controls."
- **Destructive affordance**: added a hover/focus color (`--danger`) to the per-item remove
  (×) control, matching the kit's "destructive actions are a muted red tint" guidance. No
  new state/logic was added — this is a pure CSS hover/focus rule.
- **Dialog/popover elevation**: replaced blurred `box-shadow` elevation with a small hard
  offset shadow (`Npx Npx 0 var(--shadow)`), which reads as a technical/editorial "ink stamp"
  rather than soft elevation, while still giving the floating surface visual separation.

## Validation

Run from the repository root (npm is pinned via `"packageManager": "npm@10.9.3"`, so `npm`
was used instead of `pnpm` for these scripts):

| Command                                                                | Result                                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `npm run format:write`                                                 | Pass — reformatted files listed above                             |
| `npm run lint` (`eslint . --max-warnings=0`)                           | Pass                                                              |
| `npm run typecheck` (`tsc --noEmit`)                                   | Pass                                                              |
| `npm run test:extension` (`node --test apps/extension/test/*.test.js`) | Pass — 30/30                                                      |
| `npm run check:manifest`                                               | Pass                                                              |
| `npm run check:licenses`                                               | Pass                                                              |
| `npm run build` (`next build`)                                         | Pass — static/dynamic routes compiled, `/` and `/app` prerendered |

`npm run build` initially failed on missing `BETTER_AUTH_*`/`DATABASE_URL` env vars (unrelated
to this change — the schema in `src/env.js` requires them). A local `.env` was created from
`.env.example` with placeholder dev values to unblock the build/dev server; it is not
committed (already gitignored).

`npm run check:roadmap-issues`/full `npm run check` were not run in full because
`check:roadmap-issues` and `roadmap:issues` hit external GitHub API calls unrelated to
styling; the individual checks above cover everything `check` runs except that script.

### Manual visual review

Ran `npm run dev` and reviewed with a real browser at desktop and mobile widths:

- Landing page (`/`): hero, "How it works," privacy, features, and final CTA sections at
  desktop (1440px) and mobile (414px) widths.
- Workspace app (`/app`): default/empty state, workspace creation, adding a link/note/task,
  light and dark theme, the settings popover with trash panel, and the mobile layout
  (sidebar collapses to a `<select>`, quick-add and groups reflow to one column).
- Extension `newtab.html` static layout (opened directly; `chrome.*` APIs are unavailable
  outside the extension runtime, so only the CSS/layout was inspected, not live tab data).

All surfaces rendered as a consistent monochrome, square-cornered, thin-border, uppercase-
label system in both themes, with no layout breaks, unstyled elements, or console errors
beyond an unrelated Next.js informational warning.

## Consistency audit (follow-up pass)

A second pass audited the whole repository against `design-kit/DESIGN_SYSTEM.md` and
`design-kit/tokens.css` for remaining hard-coded colors, rounded corners, mismatched
typography, excessive shadows, non-token spacing, weak focus states, missing dark-mode
styles, and mobile regressions. No React logic, routes, storage behavior, or accessibility
attributes changed — CSS only.

### Findings and fixes

- **Weak/missing focus states (accessibility gap):** `src/styles/tokens.css` had no global
  `:focus-visible` rule, so any control without a bespoke focus treatment (sidebar buttons,
  kind tabs, `+ Add workspace`, dialog/settings buttons, native `<select>`s) fell back to the
  browser's default focus ring, which is inconsistent with the monochrome system. Added a
  global `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }` (matching
  the pattern the extension already had). Also found `.add-row input` (the quick-add text
  field) set `outline: 0` with **no** replacement focus style at all — a real regression where
  tabbing into that field showed no focus indicator. Removed the stray `outline: 0` so it now
  gets the global ring. Inputs that intentionally replace the ring with a bottom-rule color
  change (`.search`, `.dialog input`, the extension's `.search-field input`) were left as-is —
  that swap is the documented `component-inventory.md` pattern, not a gap.
- **Excessive/mismatched shadows:** `component-inventory.md` specifies dialogs as "squared
  popover, 24px padding, 1px ring" with no blurred elevation. The previous pass had used hard
  offset shadows (`box-shadow: 6px 6px 0` / `8px 8px 0`) on `.settings-popover` and `.dialog`,
  and the extension's `.toast` had a soft blurred shadow. Removed all of these; each surface
  now relies solely on its existing 1px border, and `.dialog` padding was corrected from 22px
  to the specified 24px (`var(--space-6)`).
- **Hard-coded color:** `apps/extension/newtab.css` had one literal `background: #000` hover
  state on the primary action buttons instead of a token. Added an `--ink-soft` token to the
  extension's palette (mirroring the app's `--ink-soft`) and used it there instead.
- **Non-token spacing:** tokenized every exact-match `gap`/`margin-top`/`padding-top`/
  uniform `padding` declaration in `src/styles/globals.css` and `apps/extension/newtab.css`
  that equalled one of the design-kit spacing values (8/12/16/24px) to `var(--space-2|3|4|6)`
  instead of the literal pixel value (added the same `--space-*` tokens to the extension's
  `:root`, which didn't have them). Bespoke component dimensions that don't correspond to the
  4-value spacing scale (e.g. a 72px topbar, 42px hero padding, 9px card padding) were left as
  literals — tokenizing arbitrary one-off measurements against a scale that doesn't define
  them would be misleading, not a real fix.
- **Missing dark-mode styles:** the marketing/landing page had no dark-mode coverage at all —
  only the workspace app's manual theme toggle (`.app-shell.dark`) was implemented. Added a
  `@media (prefers-color-scheme: dark)` block in `src/styles/tokens.css` scoped to
  `.landing`/`body:has(.landing)` so the marketing page follows the OS preference (it has no
  toggle UI, so this is progressive, JS-free enhancement). Along the way, introduced a fixed
  `--band-surface`/`--band-on-surface` token pair for the landing hero and the "local-first"
  dark band section: those two are intentionally _always_ dark regardless of page theme (a
  deliberate contrast block), so they were switched off `--ink`/`--on-ink` (which do flip with
  the theme, correctly, for nav/CTA buttons) onto the fixed pair — otherwise system dark mode
  would have inverted the hero to a jarring white block on an otherwise-dark page. Also added
  the same `@media (prefers-color-scheme: dark)` token block to `apps/extension/newtab.css`,
  which previously hard-pinned `color-scheme: light` with no dark variant; the new-tab page
  now follows the OS/browser color scheme like the rest of the system.
- **Verification of the dark-mode fix:** manual DevTools "emulate CSS media feature" testing
  through the `computerUse` tool gave a false negative (nav/section backgrounds appeared to
  stay light). This was cross-checked with the Chrome DevTools Protocol directly
  (`Emulation.setEmulatedMedia`) plus `getComputedStyle` assertions, which confirmed
  `matchMedia('(prefers-color-scheme: dark)').matches === true`, `.landing`'s `--background`
  resolves to the dark value, `.landing-nav`'s computed background is dark, and — after adding
  `body:has(.landing)` to the override selector — `document.body`'s computed background is
  dark too (previously only the `.landing` box itself flipped; `body` behind/around it did
  not, a latent edge case for elastic overscroll). Screenshots taken via CDP at that point
  show the nav, hero, "how it works," privacy, and features sections all rendering correctly
  in dark mode.
- **Mobile check:** re-verified `/app` and `/` at a 390×844 mobile viewport via CDP screenshot
  after the above changes — sidebar still collapses to the `<select>` switcher, quick-add/
  groups still reflow to one column, and no new overflow or clipping was introduced by the
  spacing/token changes.
- **Confirmed already compliant** (no change needed): all `border-radius` declarations across
  `src/styles/*.css` and `apps/extension/newtab.css` already resolve to `var(--radius)`
  (`0px`); all `font-family` declarations use the three semantic font tokens; the extension's
  `.privacy` badge already matched the app's `.local-pill` styling 1:1; `WORKSPACE_COLORS` /
  `DEFAULT_WORKSPACE_COLOR` hex values are functional per-workspace identity data (not UI
  chrome) and were left untouched, only their rendered dot's corner radius was already square
  from the previous pass.

### Files changed in this pass

- `src/styles/tokens.css` — global `:focus-visible` rule; `.landing` dark-mode media query
  (with `body:has(.landing)`); fixed `--band-surface`/`--band-on-surface` tokens.
- `src/styles/globals.css` — removed dialog/popover hard shadows and fixed dialog padding;
  removed the dead-end `outline: 0` on the quick-add input; tokenized exact-match spacing
  values; switched the hero and "local-first" band section to the fixed band tokens.
- `apps/extension/newtab.css` — added `--ink-soft` and `--space-*` tokens; replaced the
  hard-coded `#000` hover with `--ink-soft`; removed the toast's blurred shadow; tokenized
  exact-match spacing; added the `prefers-color-scheme: dark` token block.

### Validation (this pass)

| Command                                                                                                                    | Result                    |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `npm run format:write`                                                                                                     | Pass                      |
| `npm run lint`                                                                                                             | Pass                      |
| `npm run typecheck`                                                                                                        | Pass                      |
| `npm run test:extension`                                                                                                   | Pass — 30/30              |
| `npm run check:manifest`                                                                                                   | Pass                      |
| `npm run check:licenses`                                                                                                   | Pass                      |
| `npm run build`                                                                                                            | Pass                      |
| CDP-driven dark-mode + mobile screenshot verification (`Emulation.setEmulatedMedia`, `Emulation.setDeviceMetricsOverride`) | Pass — see findings above |

## Remaining exceptions

- The extension cannot be exercised end-to-end as a loaded MV3 extension in this environment
  (no Chrome extension-loading harness here), so `newtab.html` was checked as a static file
  and via its existing automated test suite (`npm run test:extension`), not a live
  `chrome://` load. Its CSS selectors are unchanged in count/target, only their declarations.
- `src/app/_components/post.tsx` is dead code (not imported by any route); it was given a
  minimal square-corner touch-up but was not otherwise redesigned since it isn't part of any
  user-facing screen today.
