# ADR 0004: Dependency-free shared workspace contracts

**Status:** accepted  
**Date:** 2026-07-27

## Context

The Next.js workspace and build-free Manifest V3 extension evolved separate entity names, URL handling, and persistence versions. Importing the web application's Zod module into the extension would couple the service worker to a framework toolchain, while duplicating normalization logic would allow security and identity rules to drift. Existing browser profiles may already contain workspace aggregate version 1 or extension capture journal version 1 data, so adopting shared contracts cannot assume an empty database.

## Decision

Create the private, dependency-free `@tabby/workspace-contracts` package inside `apps/extension/packages/workspace-contracts`. Its location is deliberate: the unpacked extension remains directly loadable and its native ES modules cannot import files above the extension root. The Next.js client consumes the same module through a repository-relative import.

The package owns entity interfaces, item kinds, field and collection limits, schema-version constants, HTTP(S) URL normalization, fragment-free duplicate keys, and pure capture-state migration. It does not own IndexedDB, Zod, React, or Chromium APIs. Zod remains the web adapter that enforces the shared limits. The extension journal advances to version 2; version 1 records are upgraded in memory by adding the common `kind: "link"` and `createdAt` fields while retaining `capturedAt`, tab recovery metadata, operation IDs, and all unknown forward-compatible properties. A later mutation persists the upgraded state atomically at the existing database/store/key, so no IndexedDB upgrade or destructive copy is needed. Unknown schema versions fail closed instead of being silently replaced with empty state.

URL normalization accepts only string HTTP(S) URLs, canonicalizes them with the platform URL parser, and rejects embedded username/password credentials. Duplicate identity additionally removes fragments but preserves query parameters because queries may identify different resources. Previously persisted records are retained as-is during migration; the stricter rule applies at new capture and navigation-entry boundaries to avoid deleting local data.

## Consequences

Both clients now share stable vocabulary and URL semantics without making the extension depend on Next.js or a bundler. The package location is less conventional than a root `packages/` workspace, but preserves load-unpacked development and prevents a generated vendor copy from drifting. If the extension later adopts a bundler, the package should move to the root and be referenced through the workspace package name.

The web aggregate intentionally remains schema version 1 because its persisted shape did not change. Extension v1 and v2 compatibility must remain tested until an explicit data-retention policy permits removing v1 migration. The current migration validates envelope shape rather than every historical recovery field; a future repository split should add bounded schemas and quarantine reporting without making corrupt data look like an empty workspace.
