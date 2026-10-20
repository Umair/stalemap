# Qualifying: auth and crypto

Window: stable releases published after 2026-06-30 and on or before 2026-10-19, up to the pinned version. Candidates walked in rank order; only five candidates, so the list ended before 4 qualified.

| # | package | pinned | verdict | reason |
|---|---|---|---|---|
| 1 | jsonwebtoken | 9.0.3 | doesn't | no release in the window (9.0.3 is from 2025-12-04) |
| 2 | bcrypt | 6.0.0 | doesn't | no release in the window (6.0.0 is from 2025-05-11) |
| 3 | next-auth | 4.24.15 | qualifies | 4.24.15 (2026-07-20, dist-tag `latest`, 4.x line), "Security patch release for the 4.x line": `getToken()` now returns `null` instead of throwing on a malformed Bearer value, OAuth check cookies now bound to the minting provider, and two more behavior changes. No stable 5.x exists: the 5.x line is still `5.0.0-beta.*` (`beta` tag; 5.0.0-beta.32 published 2026-07-20), so it doesn't count. |
| 4 | jose | 6.2.12 | doesn't | releases 6.2.4–6.2.12 (2026-07-21 to 2026-09-05): only "Fixes", "Refactor", "Performance" and "Documentation" sections. No default value changed. 6.2.9's "types: undeprecate PBES2 p2c parameter" reverses a deprecation from before the window, so it isn't a deprecation. 6.2.13 (2026-10-20) is after the window. |
| 5 | better-auth | 1.7.11 | qualifies | 1.7.0 (2026-08-18), "❗ Breaking Changes": `experimental.joins` moved to `advanced.database.joins`, generic OAuth rebuilt on `signIn.social` (PKCE on by default), and many more |

The list ended with 2 qualifiers. Not examined: none (all five candidates were walked).

Top 3 (population built): next-auth, better-auth (only two qualified). Fourth: none.

Judgment calls:
- jose 6.2.10 "jwt: enforce explicit verification policies" (commit b347182) changes what `jwtVerify` does with some inputs: `typ: ''` is now enforced instead of ignored, a falsy non-undefined `currentDate` now throws instead of falling back to `new Date()`, and a non-finite `maxTokenAge` throws. All three are input-validation fixes in a "Fixes" section, and no default value changed, so jose was not qualified on them. The same goes for the other 6.2.5/6.2.8/6.2.10 "reject …" fixes, which tighten validation of malformed inputs.
