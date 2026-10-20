# react-router: population sources

Package `react-router` (repo remix-run/react-router), pinned at **8.5.0**. 5 entries (1 breaking, 2 deprecation, 2 default-behavior). No v3 population exists for this package.

## Versions in the window

8.2.0 (2026-07-08), 8.3.0 (2026-07-22), 8.3.1 (2026-08-28), 8.4.0 (2026-09-15), 8.5.0 (2026-10-19); backport lines 7.18.2, 7.18.3, 7.18.4, 6.30.5, 6.30.6. No major in the window.

## Sources consulted

- `packages/react-router/CHANGELOG.md` (main) sections v8.2.0–v8.5.0, read in full.
- Root `CHANGELOG.md` (the project's release notes; the GitHub releases for `react-router@8.x` just link to it) sections v8.2.0–v8.5.0 including the "What's Changed" write-ups.
- GitHub releases (`gh api repos/remix-run/react-router/releases --paginate`): 9 in-window stable releases; bodies are pointers to the changelog.
- `packages/react-router/CHANGELOG.md` at tags `react-router@7.18.2/3/4` and `@6.30.6` for the backport lines (fixes and hardening only; 6.30.5 has no GitHub release and 6.30.6 is a dependency bump of `@remix-run/router`).
- PRs #15277, #15310, #15297, #15376, #15493; `npm pack react-router@8.3.1` / `@8.4.0` to identify the changed `UNSAFE_` contexts.

Entries by source: changelog 5 (all also in the root changelog).

## Judgment calls

- `8.2.0/href-encodes-params` and `8.3.0/path-params-rfc3986-encoding` are listed under "Patch Changes" and the first is worded as a fix, but both change the URL that `href()`/`generatePath()` return for the same input; included with doubt.
- `8.4.0/unsafe-datarouter-contexts-split`: listed as a patch with a ⚠️ "breaking changes to exported `UNSAFE_` contexts"; included as breaking.
- `8.4.0/createstaticrouter-branches-deprecated` also covers `EntryContext.branches` now always being `[]` (same change).
- Only the `react-router` package is in scope; `@react-router/dev`, `/node`, `/serve`, `/express` entries (e.g. dev restart with `--conditions=development`, Web Streams server entry, `/.well-known` serving) were not extracted.

## Left out

- `createMemorySessionStorage` ids now from `crypto.randomUUID()` (8.3.0): id format of a dev/test-only storage; no API change.
- Granular internal contexts reduce re-renders (8.4.0): performance; the breaking part for `UNSAFE_` contexts is the entry.
- Fixes: `fetcher.reset()` revalidation, route ranking with extension suffixes, optional static segments, `matchPath`, `HydrateFallback` with `patchRoutesOnNavigation`, URL validation, action origin validation, RSC fixes.
- Everything under "Unstable Changes" that adds APIs (`unstable_fetch`, API-only mode, `unstable_useRouteDiscovery`, `unstable_routePatternMatching`, RSC `clientVersion`/`nonce`): new unstable features; RSC middleware short-circuit pass-through (8.5.0) is an unstable-mode fix.
- `@types/react` declared as optional peers (8.5.0): packaging.
