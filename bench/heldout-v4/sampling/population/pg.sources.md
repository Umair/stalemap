# pg: sources and judgment calls

Built 2026-10-20 following [../POPULATION.md](../POPULATION.md). Repo: brianc/node-postgres (monorepo; package `packages/pg`). Pinned version: **8.23.1**.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19 (npm `time`): **8.23.0** (2026-08-08), **8.23.1** (2026-09-30). No major in the window.

## Sources consulted

| Source | URL | Entries |
|---|---|---|
| GitHub releases | `gh api repos/brianc/node-postgres/releases` — none published in the window (the project doesn't use GitHub releases for pg) | 0 |
| CHANGELOG.md (main) | https://github.com/brianc/node-postgres/blob/master/CHANGELOG.md | 8.23.0: "Add support for query pipelining" (opt-in feature) → 0. The file states it omits patch releases and points to the commit log. |
| Commit log `pg@8.22.0...pg@8.23.1` (because the changelog defers to it for patch releases), with the PRs it references | https://github.com/brianc/node-postgres/compare/pg@8.22.0...pg@8.23.1 | 1 (#3731) |

## Entries

- 8.23.1: 1 (deprecation) — `invalid-date-serialization-deprecated`, PR #3731 "Deprecate serializing invalid `Date`s": `prepareValue` emits a `util.deprecate` warning `PG_INVALID_DATE`, output unchanged, to become an error in the next major.

## Judgment calls

- **Source for 8.23.1.** No release notes or changelog section exist for 8.23.1; the entry comes from the commit log, which the changelog names as the place for detail. Included because the commit and PR say "deprecate" outright.
- **Left out, presented as fixes:** #3756 "Pass `host` to `tls.connect` for certificate validation" — with `ssl` on and an IP-address host, the server certificate is now checked against that IP instead of silently against `'localhost'`, so a connection whose cert lacks the IP SAN can now fail (security fix; worth a second look if the walk wants behavior changes from fixes); #3720 "avoid mutating query config" (the config object passed to `client.query()` is no longer modified); #3772 Sync no longer treated as connection ending; #3728 unsigned ParameterDescription OIDs; #3780 `detail`/`hint` on native errors; #3781 empty-text named statements; pipelining fixes #3736/#3737/#3742 (pipelining was added in the window, 8.23.0).
- **Left out, features/perf/chores:** opt-in pipelining (`client.pipelining`, Pool `pipelining`) — feature, off by default; #3740 Bind serialization perf; lockfile, lint, CI. Changes to pg-cloudflare, pg-connection-string, pg-cursor, pg-query-stream are other packages.
