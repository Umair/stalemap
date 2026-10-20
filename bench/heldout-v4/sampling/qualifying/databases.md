# Qualifying: databases and ORMs

Window: stable releases published after 2026-06-30 and on or before 2026-10-19, up to the pinned version. Candidates walked in rank order until 4 qualified. `prisma` and `@prisma/client` are one family (same release train and notes) and are examined as one row.

| # | package | pinned | verdict | reason |
|---|---|---|---|---|
| 1 | mongoose | 9.11.2 | doesn't | releases 9.7.4–9.11.2 (2026-07-06 to 2026-10-12) plus backports 8.24.2–8.24.5, 7.8.11–7.8.12, 6.13.11: only `fix`, `perf`, `types`, `docs` lines and features (`strictRead`, `findAndCount()`, `queryHelper()`, middleware `skip` for cursors); MongoDB driver bumps to 7.5/7.6/7.7 are `feat` lines not marked breaking. GitHub releases and CHANGELOG.md at 9.11.2 both read. The v3 population's mongoose entries are all dated before 2026-07-01. 8.x backports change nothing 9.x didn't. |
| 2 | pg | 8.23.1 | qualifies | 8.23.1 (2026-09-30): "Deprecate serializing invalid `Date`s" (#3731) — an invalid Date parameter now emits a `PG_INVALID_DATE` DeprecationWarning. pg has no GitHub releases and its CHANGELOG.md omits patch releases and says to consult the commit log, so the commit log `pg@8.22.0...pg@8.23.1` was the source. |
| 3 | prisma (+ @prisma/client) | 7.10.1 | qualifies | 7.9.0 (2026-07-20), highlight "A safer default around destructive commands": the `migrate-reset` tool is removed from the `prisma mcp` server, and `db push --accept-data-loss` now goes through the AI safety checkpoint |
| 4 | firebase | 13.0.0 | qualifies | 13.0.0 (2026-10-07) opens a new major line |
| 5 | @supabase/supabase-js | 2.118.0 | qualifies (4th) | 2.117.0 (2026-09-22): "auth: enable passkey API by default and deprecate experimental passkey opt-in" (#2695); the experimental passkey opt-in shipped in 2.105.0 (2026-04-27), before the window |

Not examined: mongodb, mysql2, sequelize, drizzle-orm, ioredis, redis, typeorm, better-sqlite3, knex, kysely (4 qualified first).

Top 3 (population built): pg, prisma, firebase. Fourth: @supabase/supabase-js.
