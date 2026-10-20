# Qualifying: testing

Candidates walked in rank order (frame.json) until 4 qualified. Window: stable releases after 2026-06-30 and on or before 2026-10-19, up to the pinned version.

| # | package | pinned | verdict | reason |
|---|---|---|---|---|
| 1 | @testing-library/react | 16.3.3 | doesn't | One release in the window, 16.3.3 (2026-08-27): only a fix ("Avoid act() re-entrant when dispatching events", #1468, under Bug Fixes; the PR fixes nested-act console warnings). |
| 2 | jest | 30.5.2 | qualifies | 30.5.0 (2026-08-28): e.g. "[jest-runtime] Route `process.getBuiltinModule` through the sandbox ... instead of the host's" (behavior change for the same input) and "[@jest/source-map] Deprecate `getCallsite`" (deprecation). |
| 3 | vitest | 5.0.5 | qualifies | 5.0.0 (2026-09-03) opens a new major line. |
| 4 | jsdom | 30.1.3 | qualifies | 30.0.0 (2026-07-27) opens a new major line. |
| 5 | mocha | 12.0.3 | qualifies (4th) | 12.0.0 (2026-08-31) opens a new major line. Not built (4th package). |

Stopped after mocha; chai, @playwright/test/playwright, sinon, cypress and msw were not examined.

Top 3 (population built): jest, vitest, jsdom. 4th: mocha.
