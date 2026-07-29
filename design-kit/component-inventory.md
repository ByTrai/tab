# Component inventory

## Button

Compact uppercase actions with optional icon + label. Variants: primary, outline, secondary, ghost, destructive, link. Sizes: 28, 36, 40, 44px. Hover changes fill; focus uses a 2px ring; active moves 1px; disabled is inert/50% opacity. Use square corners and wide tracking. Evidence: `components/ui/button.tsx`.

## Input and select

Low-chrome data entry: label, control, optional error. Default input has a bottom rule; focus changes that rule to focus color; invalid changes it to destructive. Evidence: `components/ui/input.tsx`, `components/ui/field.tsx`.

## Navigation, card, empty state, dialog

Navigation uses a subtle active fill. Cards use 1px borders, not roundness or large shadows. Empty states use dashed boundaries. Dialogs use a light black overlay, squared popover, 24px padding, 1px ring, and 100ms fade/zoom. Evidence: `components/site-header.tsx`, `components/ui/empty.tsx`, `components/ui/dialog.tsx`.
