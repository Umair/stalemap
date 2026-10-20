# Qualifying: server

Window: stable releases published after 2026-06-30 and on or before 2026-10-19, up to the pinned version. Candidates walked in rank order until 4 qualified.

| # | package | pinned | verdict | reason |
|---|---|---|---|---|
| 1 | express | 5.3.0 | qualifies | 5.3.0 (2026-10-09), "Improvements": `req.fresh` now evaluates QUERY requests (and 7 more behavior changes). 4.22.3 (2026-09-14) is a 4.x backport. |
| 2 | cors | 2.8.6 | doesn't | no release in the window (2.8.6 is from 2026-01-22) |
| 3 | multer | 2.4.0 | qualifies | 2.3.0 (2026-08-28): files exactly at `limits.fileSize` accepted, `file.originalname` decodes `%0A`/`%0D`/`%22`; 2.4.0 (2026-09-14): field names decoded, invalid `limits` throw at construction, and more |
| 4 | socket.io | 4.8.4 | doesn't | release 4.8.4 (2026-09-25): only "Bug Fixes" (pending acks cleanup, uWS missing client files, stateful regexps rejected for dynamic namespaces, two type fixes) and a `ws` bump not marked breaking |
| 5 | helmet | 8.3.0 | qualifies | 8.3.0 (2026-07-12), "Changed": CSP throws for invalid directive names it accepted before (`DefaultSrc`, `-default-src`); also `useDefaults: false` with no directives now a type error and a runtime throw |
| 6 | @nestjs/core | 12.2.0 | qualifies | 12.0.0 (2026-08-27) opens a new semver-major line; qualifies without reading notes |

Stopped after 4 qualifiers. Not examined: ws, hono, fastify, koa.

Top 3 (population built): express, multer, helmet. Fourth: @nestjs/core.
