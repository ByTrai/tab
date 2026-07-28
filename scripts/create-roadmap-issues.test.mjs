import assert from "node:assert/strict";
import test from "node:test";
import { issueBody, parseRoadmap } from "./create-roadmap-issues.mjs";

const sample = `# Roadmap
### T1.1 — Contracts

**Owner:** \`@tommy\`
**Status:** \`in-progress\`
**Depends on:** T0.1

- Preserve fixtures.

### T1.2 — Commands

**Owner:** \`unassigned\`
**Status:** \`blocked\`
`;

test("parses assignable roadmap cards and metadata", () => {
  assert.deepEqual(parseRoadmap(sample).map(({ id, name, owner, status }) => ({ id, name, owner, status })), [
    { id: "T1.1", name: "Contracts", owner: "@tommy", status: "in-progress" },
    { id: "T1.2", name: "Commands", owner: "unassigned", status: "blocked" },
  ]);
});

test("adds a stable idempotency marker to issue bodies", () => {
  const body = issueBody(parseRoadmap(sample)[0]);
  assert.match(body, /<!-- tabby-roadmap-card:T1\.1 -->/);
  assert.match(body, /\*\*Depends on:\*\* T0\.1/);
});
