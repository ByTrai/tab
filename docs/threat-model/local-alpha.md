# Local alpha threat model

## Sensitive assets

Saved URLs, titles, note/task text, workspace names, and exported backups can reveal private activity. They remain in browser IndexedDB unless the user explicitly exports them.

## Trust boundaries and controls

- Imported JSON is untrusted: Zod enforces a versioned schema, field lengths, and collection limits; the UI caps files at 10 MB and asks before replacement.
- Navigated URLs are untrusted: the shared contract accepts only string `http:` and `https:` URLs, rejects embedded credentials, and applies the platform URL canonicalizer; links use `rel="noreferrer"`.
- User text is rendered through React text nodes, not raw HTML.
- No analytics, remote favicon request, page-content collection, or background sync exists.
- Writes complete in one IndexedDB transaction before UI state reports success.

## Residual risks

Browser profiles and exported files are not encrypted. Anyone with profile/file access may read them. The current whole-aggregate storage approach should be replaced with indexed entity stores before the 10,000-item performance gate. Import is replace-only and lacks rollback history. A production extension additionally requires CSP, permission, service-worker restart, safe-close, and browser integration review.

## Manifest V3 extension boundary

- The unpacked extension requests only `tabs`; it has no host permission, content script, remote code, analytics, or network transport.
- Browser/internal, local-file, missing, invalid, and non-HTTP(S) URLs are shown as restricted and cannot enter the capture path.
- Saved items and the idempotent operation record commit together in IndexedDB before any call to `chrome.tabs.remove`.
- Pinned tabs are never passed to removal. Closure intent is journaled first so restart-time undo retains its recovery payload.
- Titles and addresses are inserted using DOM text properties. Saved links open with `rel="noreferrer"`.
- Duplicate comparison strips URL fragments. Query parameters remain because removing them can change resource identity.
- The shared capture migration preserves legacy records and recovery metadata. Unknown schema versions fail closed instead of being silently replaced with empty state, reducing accidental local-data loss during downgrade or incompatible upgrades.

Residual extension risks include unencrypted browser-profile data, storage quota exhaustion, extension removal deleting local data, and Chromium behavior that cannot make tab creation plus journal advancement one atomic transaction. Store publication still requires a manual permission/CSP review and real-browser failure testing.

Legacy records are retained rather than revalidated destructively, so a URL captured by an older release may not satisfy today's credential restriction. Any future UI that navigates historical records must normalize and authorize again at the navigation boundary. URL canonicalization also does not determine whether an HTTP(S) destination is trustworthy; phishing, loopback, and private-network destinations remain possible without host-level policy.
