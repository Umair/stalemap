# Qualifying: meta-frameworks and routing (`meta-frameworks`)

Candidates walked in rank order; stopped once 4 qualified. Window: stable releases after 2026-06-30, on or before 2026-10-19, up to the pinned version.

| # | Package | Pinned | Verdict | Reason |
|---|---|---|---|---|
| 1 | next | 16.4.2 | qualifies | 16.3.0 (2026-08-03): the Edge runtime and `preferredRegion` are deprecated (#93369); also `unstable_catchError`→`catchError` with no alias (#94610) and more |
| 2 | react-router | 8.5.0 | qualifies | 8.4.0 (2026-09-15), "Minor Changes": `createStaticRouter({ branches })` deprecated (#15297); 8.5.0 deprecates the view transition APIs (#15493) |
| 3 | astro | 7.4.1 | qualifies | 7.4.0 (2026-10-15), "Minor Changes": minimum Node.js raised to 22.22.0 (#18277) |
| 4 | @sveltejs/kit | 3.1.0 | qualifies | 3.0.0 (2026-10-01) opens a new semver-major line (qualifies without reading notes) |
| 5 | nuxt | 4.6.2 | not examined | category filled at 4 |
| 6 | @remix-run/react | 2.17.5 | not examined | category filled at 4 (it has no release in the window anyway: last stable 2.17.5, 2026-06-01) |

Frame for this category (top 3): next, react-router, astro. Fourth: @sveltejs/kit.
