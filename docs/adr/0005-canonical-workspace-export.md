# ADR 0005: Canonical workspace export contract

**Status:** accepted, integration validation pending  
**Date:** 2026-07-28

## Context

The web alpha persists schema v1 arrays while the extension persists capture journal v1/v2. Both need one bounded, portable vocabulary before IndexedDB repositories or UI commands converge. Import data is untrusted and can contain unsafe URLs, invalid timestamps, broken references, duplicate identifiers, or collections intended to exhaust memory.

## Decision

Keep the dependency-free contract package inside the unpacked extension boundary established by ADR 0004. Introduce canonical workspace export schema v2 while retaining `WORKSPACE_SCHEMA_VERSION` 1 for the current web store. Migration accepts web schema v1 or canonical v2, validates collection bounds before mapping, enforces globally unique client-generated IDs, referential integrity, item-specific fields, canonical millisecond UTC timestamps, and HTTP(S)-only credential-free links, then returns newly allocated canonical data.

Entity order is a finite number. Inserts use the midpoint between adjacent values; append/prepend use a unit gap. Precision exhaustion fails explicitly and requires a collection rebalance rather than silently creating duplicate positions. Array order supplies deterministic positions when migrating v1. Serialization reconstructs canonical property order and emits formatted JSON with a trailing newline, making identical logical exports byte-stable.

Capture journal v1/v2 remain separate persistence envelopes because they contain browser recovery metadata. Their migration now applies collection bounds and canonical UTC validation while preserving unknown recovery fields and historical URLs as required by ADR 0004. Recovery records and tombstones are defined as portable contracts but are not persisted until repository/command cards define their lifecycle.

## Consequences

Existing web data is not rewritten by this card. Consumers can dry-run migration without partial writes or mutation. Numeric fractional ordering is simple and JSON-native, but repeated insertion between the same neighbors eventually requires deterministic rebalance; T1.2 must expose that as a domain command invariant. Export schema v2 is intentionally distinct from internal rows, allowing T2.2 to evolve persistence without changing backups.

The package still uses handwritten runtime validation to remain build-free. This avoids framework coupling but requires focused fixtures and parity with the web Zod adapter. Full TypeScript integration validation remains pending until the registry-backed dependency baseline succeeds.
