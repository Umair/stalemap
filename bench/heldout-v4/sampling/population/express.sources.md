# express: sources and judgment calls (v4)

Package `express`, pinned **5.3.0**. Built from v3's `population/express.jsonl`; every in-window release was re-read for v4.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19 (npm `time`, via `frame.json`):

| version | published | line |
|---|---|---|
| 4.22.3 | 2026-09-14 | 4.x backport |
| 5.3.0 | 2026-10-09 | 5.x (pinned) |

No express release after 5.3.0 up to 2026-10-19, so nothing after v3's 2026-10-15 cutoff to add.

## Sources consulted

| source | entries |
|---|---|
| https://github.com/expressjs/express/releases/tag/v5.3.0 (Highlights: Bug fixes, Improvements, Performance; What's Changed) | 8 |
| https://github.com/expressjs/express/blob/master/History.md (5.3.0 section) | 0 new (same text as the release) |
| https://github.com/expressjs/express/blob/4.x/History.md (4.22.3 section; there is no GitHub release for 4.22.3) | 0 (see below) |
| `gh api repos/expressjs/express/releases` (all releases since 2026-06-01) | only v5.3.0 |

Total: 8 entries, all `default-behavior`. The bundled middleware (body-parser 2.3.0, content-type 2.0, content-disposition 2.0.1, qs, proxy-addr, type-is) is covered only as far as express's own 5.3.0 notes report it, as v3 did.

## Reuse of v3

All 8 entries are v3's 5.3.0 entries, ids and summaries unchanged (re-checked against the release text):
`fresh-query-method`, `redirect-html-body`, `render-null-options`, `send-keeps-content-type-params`, `send-unparseable-content-type`, `error-handler-logs-full-error`, `content-disposition-unquoted-token`, `body-parser-invalid-limit-throws`.

Dropped from v3 because they are dated before 2026-07-01: `express@5.2.0/extended-query-plain-object` and `express@5.2.0/redirect-argument-deprecations` (both 2025-12-01).

v3's judgment calls on 5.3.0 stand (see `bench/heldout-v3/sampling/population/express.sources.md`): `render-null-options`, `send-unparseable-content-type` and `body-parser-invalid-limit-throws` were included while unsure; the Bug fixes section (Content-Length vs Transfer-Encoding), the qs and proxy-addr CVE bumps, the type-is bump, the performance item and `req.acceptsCharsets` (#6088, a backward-compatible feature) were left out.

## Judgment calls new in v4

- **4.22.3 shipped the QUERY freshness change first** (2026-09-14, "Allow conditional revalidation for QUERY requests"), 25 days before 5.3.0. The entry stays dated at 5.3.0 with v3's id: 4.22.3 is a backport on the 4.x line, not the pinned line, and POPULATION.md step 1 counts backports only when they changed something the newest line didn't. Worth a second look if "first stable release in the window that shipped it" is meant across lines; the date would then be 2026-09-14 and the id would change, breaking the match with v3.
- 4.22.3's other bullet (`deps: qs@~6.16.0`) is a dependency bump, and 4.x-only anyway.
