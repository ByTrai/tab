# ADR 0001: Local-first web alpha

**Status:** accepted for alpha  
**Date:** 2026-07-26

## Context

The roadmap proposes a Chromium extension, but the repository only contains a Next.js application. The highest-value foundation that can be reviewed immediately is the account-free workspace and its data invariants.

## Decision

Ship the reviewable experience first as a responsive Next.js client application. Keep the domain schema and IndexedDB adapter independent of server/auth code. Persist one validated aggregate in a single read-write transaction. Accept only HTTP(S) links and version all exports. Do not claim tab capture, synchronization, E2EE, or self-hosting readiness until each is implemented and independently reviewed.

## Consequences

The product is useful for manually captured resources and provides a design/product-review base. It does not yet read or close browser tabs. The next implementation should reuse the domain and persistence boundaries in a Manifest V3 extension, adding an idempotent operation journal before any close action.
