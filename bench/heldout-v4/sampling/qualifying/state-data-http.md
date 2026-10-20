# Qualifying: state, data fetching and HTTP (`state-data-http`)

Window: stable releases published after 2026-06-30 and on or before 2026-10-19, up to the pinned version. Candidates walked in rank order until 4 qualified.

| # | package | pinned | verdict | reason |
|---|---|---|---|---|
| 1 | axios | 1.20.0 | qualifies | 1.20.0 (2026-08-26), "Breaking Changes & Deprecations": `HttpStatusCode.PayloadTooLarge` / `UnprocessableEntity` deprecated (#11082) |
| 2 | rxjs | 7.8.2 | doesn't | no release in the window |
| 3 | @tanstack/react-query | 5.104.5 | qualifies | 5.102.0 (2026-08-22): `experimental_prefetchInRender` and the result `promise` property removed (#11221); query-core 5.102.0 deprecates `fetchQuery`/`prefetchQuery`/`ensureQueryData` and the infinite variants (#10658) |
| 4 | @reduxjs/toolkit | 2.13.0 | qualifies | 2.13.0 (2026-09-29): supported TypeScript raised to 5.6+ (a raised minimum TypeScript version is breaking under the protocol) |
| 5 | zustand | 5.0.15 | doesn't | release 5.0.15: only fixes (devtools stack regex, persist `clearStorage()` vs concurrent rehydration) |
| 6 | node-fetch | 3.3.2 | doesn't | no release in the window |
| 7 | graphql | 17.0.2 | doesn't | releases 17.0.2 and 15.10.3 (backport line): only fixes, polish and internal release flow |
| 8 | @apollo/client | 4.3.5 | qualifies (4th) | 4.3.0 (2026-09-11), "Minor Changes": minimum supported TypeScript raised to 5.9 (#13421); also `skip` deprecated in `useQuery`/`useSubscription` (#13448) |

Stopped after @apollo/client (4 qualifying). Population built for the top 3: axios, @tanstack/react-query, @reduxjs/toolkit.
