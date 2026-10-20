# Qualifying: utilities

Window: stable releases published after 2026-06-30 and on or before 2026-10-19, up to the pinned version. Candidates walked in `frame.json` rank order until 4 qualified. Top 3 (population built): **dotenv, moment, nodemailer**. Fourth: **sharp**.

| # | package | pinned | verdict | reason |
|---|---|---|---|---|
| 1 | dotenv | 18.0.8 | qualifies | 18.0.0 (2026-09-17) opens a new major line. |
| 2 | date-fns | 4.4.0 | doesn't | No release in the window (4.4.0 is from 2026-05-29). |
| 3 | uuid | 14.0.3 | doesn't | Releases 14.0.2 (2026-08-18) and 14.0.3 (2026-10-10): only bug fixes (v1 nsecs overflow, v1 multicast bit, v7 seq formula; CITGM fix). GitHub releases and CHANGELOG.md agree. |
| 4 | moment | 2.31.0 | qualifies | 2.31.0 (2026-09-15), section "Updates to existing locales" (not the bug-fix section): "Ukrainian ('uk'): Use ISO week numbering" (#6360) changes the uk locale's `week.doy` default from 7 to 4, so `week()` returns different numbers for the same date. Judgment call: the PR is titled "[bugfix]"; it counts because the notes file it outside the bug-fix section and it changes a locale default value. Every other 2.31.0 entry is a bug or security fix, a new locale or an internal hook. |
| 5 | nodemailer | 10.1.7 | qualifies | 10.0.0 (2026-09-04) opens a new major line. |
| 6 | lodash | 4.18.1 | doesn't | No release in the window (4.18.1 is from 2026-04-01). |
| 7 | sharp | 0.35.5 | qualifies (4th) | 0.35.3 (2026-07-01): "Increase default concurrency when use of `MALLOC_ARENA_MAX` is detected", a default change. (0.35.3 also changes `toBuffer`'s TypeScript return type to `Buffer<ArrayBuffer>`.) |

Not examined (the category filled at sharp): dayjs, chalk, nanoid and the further candidates.
