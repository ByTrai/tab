# ADR 0002: Manifest V3 safe-capture boundary

**Status:** accepted for alpha  
**Date:** 2026-07-26

## Context

Closing a browser tab is irreversible from the extension's perspective unless enough recovery data was committed first. Manifest V3 service workers can also stop between asynchronous browser operations. The capture workflow therefore cannot be a UI-only sequence.

## Decision

Package a dependency-free Chromium extension in `apps/extension` so it can be loaded unpacked without a build step. Isolate `chrome.tabs` behind `ChromiumBrowserAdapter` and keep capture rules in a testable `CaptureService`. Request only the `tabs` permission; IndexedDB needs no extension permission.

Each command has a caller-generated idempotency ID. A single IndexedDB transaction commits saved items and the operation journal before browser closure is attempted. Closure intent and candidate tab IDs are journaled before `chrome.tabs.remove`. Pinned tabs are saved but excluded from closure. Undo reloads the journal after worker restart, avoids reopening a URL already present, removes captured records, and records completion.

Duplicates are compared using normalized HTTP(S) URLs without fragments and skipped by default. Restricted or missing URLs remain visible with an explanation but cannot be selected.

## Consequences

The extension remains local-only and works without a server, bundler, content script, host access, or account. Whole-state IndexedDB mutations are intentionally simple but must move to indexed entity/operation stores before large-scale performance claims. There is a narrow browser/API crash boundary between creating a restored tab and persisting that individual restore; URL-presence reconciliation limits duplication but is not cross-window exact-once semantics.
