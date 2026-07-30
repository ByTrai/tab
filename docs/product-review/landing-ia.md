# Landing information architecture (T7.1)

Status: approved against the shipped `/` page. TabExtend is workflow inspiration only — copy, visuals, and claims are original to Tabby.

## Audiences

1. **Tab-heavy individuals** evaluating a local save → close → resume tool.
2. **Developers / self-host curious** who want source and no-account local use.
3. **Contributors** arriving from GitHub.

## Primary CTAs

| Priority | CTA                                  | Destination   | When honest              |
| -------- | ------------------------------------ | ------------- | ------------------------ |
| P0       | Try the local workspace              | `/app`        | Always (shipped)         |
| P0       | View source                          | GitHub repo   | Always                   |
| P1       | Open app (nav)                       | `/app`        | Always                   |
| Deferred | Install browser extension from store | Store listing | Only after store release |
| Deferred | Join waitlist / sync signup          | Account flow  | Only after Gate D        |

## Section inventory (shipped)

1. **Nav** — brand, How it works, Privacy, Features, Open app.
2. **Hero** — brand-first “Tabby”, one headline, one support sentence, CTA group, decorative mock (aria-hidden).
3. **How it works** — Save / Close / Resume steps (local web honest framing).
4. **Privacy** — on-device storage, no account required to start, no content telemetry claim.
5. **Features** — links, notes, tasks, search, import/export — only capabilities that ship.
6. **Closing CTA** — repeat local workspace + source.
7. **Footer** — legal/community links, no analytics scripts.

## Claim rules

- Do **not** advertise sync, E2EE, Firefox shipping, self-hosting stability, collaboration, or Chrome Web Store availability until those gates pass.
- Extension capture/organize is real for unpacked Chromium loads; store install is not claimed on the landing page.
- Prefer “local-first” / “on this device” over “cloud backup.”

## Privacy-safe metrics

Default: **no analytics**. If metrics are added later, they must never include workspace titles, URLs, notes, or export contents (see threat model).

## Accessibility annotations

- Skip link to `#main`.
- Landmark nav labels; section `aria-labelledby` headings.
- Hero mock is decorative (`aria-hidden`).
- Performance budget: minimal client JS on `/`; no remote tracking fonts beyond `next/font`.
