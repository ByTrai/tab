# Security Policy

## Supported versions

Security fixes target the default branch of [ByTrai/tab](https://github.com/ByTrai/tab). Pre-release / alpha builds may receive patches when a fix is practical; there is no long-term support window yet.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report privately through **GitHub Security Advisories** for this repository:

1. Open [https://github.com/ByTrai/tab/security/advisories/new](https://github.com/ByTrai/tab/security/advisories/new)
2. Include steps to reproduce, affected surfaces (web app, extension, contracts, auth), and any known impact.
3. Avoid attaching real workspace exports, browsing history, credentials, or personal data.

We aim to acknowledge private reports within **7 days** and to share a remediation plan or clarifying questions once the report is triaged.

## Scope notes

- Local IndexedDB and export/import paths treat user content and URLs as untrusted input.
- Authentication is optional for the local workspace; OAuth configuration must not hardcode callback origins.
- Do not test destructive techniques against deployments you do not own.

Thank you for helping keep Tabby safe for early users and contributors.
