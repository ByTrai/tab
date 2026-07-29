# Evidence

| Decision | Token/rule | Evidence | Source | Confidence |
|---|---|---|---|---|
| Near-white canvas / near-black text | background, foreground | explicit OKLCH variables | `app/globals.css` | verified |
| Square shape language | radius none | repeated `rounded-none` | `components/ui/button.tsx`, `dialog.tsx` | verified |
| Three-role type scale | body/heading/mono | font declarations | `app/layout.tsx` | verified |
| Thin neutral rules | border | explicit `--border` | `app/globals.css` | verified |
| Compact uppercase controls | button label rule | explicit classes | `components/ui/button.tsx` | verified |
| Sparse bordered surfaces | card composition | component/page usage | `components/ui/empty.tsx` | inferred |
