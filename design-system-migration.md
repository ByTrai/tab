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

| Command | Result |
| --- | --- |
| `npm run format:write` | Pass — reformatted files listed above |
| `npm run lint` (`eslint . --max-warnings=0`) | Pass |
| `npm run typecheck` (`tsc --noEmit`) | Pass |
| `npm run test:extension` (`node --test apps/extension/test/*.test.js`) | Pass — 30/30 |
| `npm run check:manifest` | Pass |
| `npm run check:licenses` | Pass |
| `npm run build` (`next build`) | Pass — static/dynamic routes compiled, `/` and `/app` prerendered |

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

## Remaining exceptions

- The extension cannot be exercised end-to-end as a loaded MV3 extension in this environment
  (no Chrome extension-loading harness here), so `newtab.html` was checked as a static file
  and via its existing automated test suite (`npm run test:extension`), not a live
  `chrome://` load. Its CSS selectors are unchanged in count/target, only their declarations.
- `src/app/_components/post.tsx` is dead code (not imported by any route); it was given a
  minimal square-corner touch-up but was not otherwise redesigned since it isn't part of any
  user-facing screen today.
