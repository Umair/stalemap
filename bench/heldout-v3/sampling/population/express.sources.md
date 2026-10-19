# express: sources and judgment calls

Package `express`, 5.x line only (4.x backports ignored per the task brief). Pinned version **5.3.0**.

## Version range

Stable `express` versions published after 2025-07-31 and on or before 2026-10-15, from `npm view express time --json` (UTC):

| version | npm publish date | line |
|---|---|---|
| 5.2.0 | 2025-12-01 | 5.x |
| 5.2.1 | 2025-12-01 | 5.x (reverts 5.2.0's query-parser change) |
| 5.3.0 | 2026-10-09 | 5.x |
| 4.22.0, 4.22.1, 4.22.2, 4.22.3 | 2025-12-01, 2025-12-01, 2026-05-11, 2026-09-14 | 4.x backports, ignored |

## Sources consulted

| source | entries |
|---|---|
| https://github.com/expressjs/express/releases/tag/v5.2.0 | 2 |
| https://github.com/expressjs/express/releases/tag/v5.2.1 (revert notice) | 0 (noted on the 5.2.0 entry) |
| https://github.com/expressjs/express/releases/tag/v5.3.0 ("Highlights": Bug fixes, Improvements, Performance; "What's Changed") | 8 |
| https://github.com/expressjs/express/blob/master/History.md (sections 5.3.0, 5.2.1, 5.2.0) | 0 new; same text as the releases, plus the 5.2.0 `res.redirect` deprecation bullet |
| https://github.com/expressjs/express/security/advisories/GHSA-pj86-cfqh-vqx6 (CVE-2024-51999, rejected; describes the 5.2.0 change) | used for the 5.2.0 entry's summary |
| https://github.com/expressjs/express/pull/6405 (the `res.redirect` deprecation diff) | used for the deprecation entry's summary |
| https://github.com/expressjs/express/pull/6088 (`req.acceptsCharsets`) | 0 |
| https://expressjs.com/en/blog/ (index, pages 1–3) and the posts 2025-12-01-security-releases, 2026-07-31-security-releases, 2026-08-31-security-releases, 2026-09-30-security-releases | 0 |
| GitHub releases 4.22.0, 4.22.1, 4.22.2 (read only to check for 5.x-relevant notes) | 0 |

Total: 10 entries: 9 `default-behavior`, 1 `deprecation`, 0 `breaking`.

There is no Express blog post for 5.2.0, 5.2.1 or 5.3.0. The blog posts in the window are monthly "Security Releases" posts about dependency packages (body-parser, qs, proxy-addr, multer, …); the ones that touch dependencies express 5.3.0 upgraded (2026-07-31 for body-parser 2.3.0, 2026-09-30 for proxy-addr 2.0.8) were read and add nothing beyond the 5.3.0 release notes.

## Judgment calls, 5.2.0

Included:
- `extended-query-plain-object` (default-behavior): the "security fix for CVE-2024-51999" made `req.query` a prototype-less object under `'query parser': 'extended'`. Shipped in a stable release, so it is listed; **reverted in 5.2.1** (the CVE was rejected as a correctness issue, not a vulnerability), so it is not in the pinned version. The summary says so; the walk is expected to skip it under S3.
- `redirect-argument-deprecations` (deprecation): from the 5.2.0 "What's Changed" list ("add deprecation warnings for redirect arguments undefined", #6405) and History.md. The diff adds three `depd` warnings in `res.redirect`: missing URL, non-string URL, non-number status. One entry, since they are one change to one method's argument validation.

Left out:
- `deps: body-parser@^2.2.1` (CVE-2025-13466, a DoS fix in urlencoded parsing): dependency bump, no default or API change.
- Everything else in "What's Changed" is CI, docs, tests, lint, refactors ("use req.socket over deprecated req.connection" is internal; "Remove history.md from being packaged" is packaging).

## Judgment calls, 5.2.1

Only the revert. No entry of its own (the reverted change is recorded once, at 5.2.0, with the revert noted).

## Judgment calls, 5.3.0

Included (all default-behavior; all from the "Improvements" section, which the notes present as behavior changes rather than fixes):
- `fresh-query-method`: `req.fresh` now considers QUERY requests; a QUERY with a matching validator gets 304 where it got 200 before.
- `redirect-html-body`: the HTML redirect body gains doctype/title/body wrappers. Output-only, but a changed response for the same input.
- `render-null-options`: `app.render(view, null, cb)` no longer errors. Presented as an improvement, but it is close to a bug fix (a relaxation). Unsure; included.
- `send-keeps-content-type-params` and `send-unparseable-content-type`: one bullet (the `content-type` 2.0 upgrade) states two distinct behavior changes of `res.send()`, split into two entries. The second concerns a malformed header value; unsure, included.
- `error-handler-logs-full-error`: logging only (the default error handler's console output). Included because the notes present it as a change; the walk may find it S1.
- `content-disposition-unquoted-token`: the `Content-Disposition` header bytes change for token-safe filenames; the notes explicitly warn that assertions on exact header bytes must change.
- `body-parser-invalid-limit-throws`: the `body-parser` 2.3.0 upgrade changes `express.json()` & co. from fail-open to throwing on an invalid `limit`. It is a security fix that changes behavior (throw instead of ignore) for a given option value, so it counts; the input is malformed, so unsure.

Left out:
- "Bug fixes": `res.send()` no longer sets `Content-Length` alongside `Transfer-Encoding` (and ETag still generated): bug fix.
- `qs` → `^6.16.0` (CVE-2026-2391, -82417, -82562: `arrayLimit` bypasses in comma parsing, `isBuffer` DoS): security fixes on crafted input, no stated default change.
- `proxy-addr` → `^2.0.8` (CVE-2026-90711, IPv4-mapped IPv6 trust subnets): security fix of a subnet-matching bug; no default change.
- `type-is` → `^2.1.0`: dependency bump with no stated behavior change.
- "Performance": duplicate Content-Type processing avoided.
- "What's Changed" extras: `req.acceptsCharsets` accepting comma-delimited / rest arguments (#6088; the PR says backwards compatible, a feature), `trimRight` → `trimEnd` (internal), docs/CI/tests.

## 4.x notes (ignored by instruction, recorded for completeness)

- 4.22.0 shipped the same CVE-2024-51999 change and 4.22.1 reverted it.
- 4.22.2 "restore >20 array parsing for `req.query` repeated keys" (and raising the indexed-notation cap to 1000) is a 4.x-only `qs` adjustment; History.md shows no equivalent change in 5.x, where the extended parser is not the default. Not listed.
