# Qualifying: validation and data

Window: stable releases published after 2026-06-30 and on or before 2026-10-19, up to the pinned version. Release lists from `npm view <pkg> time --json`; notes from GitHub releases, changelog files and (joi) the GitHub milestones that serve as hapi's changelog. Candidates walked in rank order; the list ended with 2 qualifying packages, so the category is short of 4 (and of 3).

| # | Package | Pinned | Verdict | Reason |
|---|---|---|---|---|
| 1 | zod | 4.6.7 | qualifies | 4.5.0 (2026-08-28), "⚠️ `z.iso.datetime()` requires seconds": minute-precision datetimes such as `2020-01-01T06:15Z` are now rejected (⚠️-marked, commit `fix(v4)!:`). |
| 2 | yup | 1.7.1 | doesn't | no release in the window (1.7.1 is 2025-09-21) |
| 3 | class-validator | 0.15.1 | doesn't | no release in the window (0.15.1 is 2026-02-26) |
| 4 | joi | 18.3.0 | doesn't | releases 18.2.4–18.3.0 and backports 17.13.5–17.13.8: only bug/security fixes (`__proto__` rename target rejected, `messages()` `__proto__` keys rejected, `email({ allowUnderscore })` accepted, isoDate timeshift padding, failover + external), perf chores, and one opt-in feature (18.3.0 `prepare: { method, undefined: true }` for extensions; default behavior unchanged). No milestone issue carries a breaking-changes label. |
| 5 | ajv | 8.20.0 | doesn't | no release in the window (8.20.0 is 2026-04-24) |
| 6 | superjson | 2.2.6 | doesn't | no release in the window (2.2.6 is 2025-11-27) |
| 7 | valibot | 1.5.0 | qualifies | 1.5.0 (2026-09-09), "Change Standard Schema properties to use eager initialization … and replace internal `_getStandardProps` utility with `_standardSchema`": `_getStandardProps` was a public export of 1.4.2 and is gone in 1.5.0 (removes a public export). |

Qualifying order: 1. zod, 2. valibot. No third or fourth package in this category.
