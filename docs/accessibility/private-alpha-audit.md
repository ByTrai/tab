# Accessibility audit — private alpha (T5.2)

**Surfaces:** landing `/`, web `/app`, extension new-tab, extension popup  
**Standard target:** WCAG 2.2 AA  
**Date:** 2026-07-30  
**Method:** automated smoke (`npm run check:a11y`) + structured keyboard/contrast review against shipped markup

## Summary

| Severity          | Count                       | Release impact                |
| ----------------- | --------------------------- | ----------------------------- |
| Critical          | 0 open                      | Would block release           |
| Major             | 0 open (fixes in this pass) | Should fix before public beta |
| Minor / follow-up | noted below                 | Track for T5.2 polish         |

No critical blockers found for private alpha after the targeted fixes listed below.

## Automated smoke

`scripts/check-a11y-smoke.mjs` verifies:

- Landing and workspace entry points expose primary landmarks / skip link patterns in source.
- Extension `newtab.html` and `popup.html` have `lang`, labelled controls, live regions for status, and focus-visible CSS.
- Shared tokens define a visible `:focus-visible` / `.skip-link:focus` treatment.

Run: `npm run check:a11y` (also wired into `npm run check`).

## Keyboard flows reviewed

| Flow                                               | Result | Notes                                           |
| -------------------------------------------------- | ------ | ----------------------------------------------- |
| Landing nav → CTAs → footer                        | Pass   | Skip link present                               |
| `/app` workspace switch, search, quick-add Enter   | Pass   | Search labelled                                 |
| `/app` create workspace/group dialog               | Pass   | Focus to input; Escape closes; Cancel available |
| `/app` import confirm dialog                       | Pass   | Escape cancels (fixed this pass)                |
| `/app` settings popover                            | Pass   | `aria-expanded` + Escape (fixed this pass)      |
| Extension new-tab capture / organize / note editor | Pass   | Note fields labelled; status live region        |
| Extension popup capture / undo                     | Pass   | Status live region; exact Save vs Save & close  |

## Contrast, zoom, motion

- Design tokens use near-monochrome ink/border/muted pairs from `design-kit` (AA intent for body and UI chrome).
- 200% zoom: app shell uses fluid layout; sidebar collapses to select on narrow widths.
- Reduced motion: token/motion handling lives in `src/styles/tokens.css` (no decorative infinite motion on landing after design-system pass).

## Screen reader notes (spot check)

- Brand marks decorative where marked `aria-hidden`.
- Status regions use `role="status"` / `aria-live="polite"` on capture surfaces.
- Kind selectors expose `aria-pressed` (fixed this pass).

## Follow-ups (non-blocking)

1. Full NVDA/VoiceOver scripted pass on Windows/macOS with real users.
2. Focus trap inside modal dialogs (roving tab still reaches backdrop siblings in some browsers).
3. Drag-and-reorder keyboard equivalents when pointer reordering ships.
4. Lighthouse CI budgets on production landing build (T7.2 follow-up).

## Fixes applied in this pass

- Global `:focus-visible` outline for interactive controls in `globals.css`.
- Settings control: `aria-expanded`, `aria-controls`; Escape closes popover.
- Import dialog: Escape cancels.
- Kind buttons: `aria-pressed`.
- Popup: visible page heading for the capture surface.
