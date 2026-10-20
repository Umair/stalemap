# next: population sources

Package `next` (repo vercel/next.js), pinned at **16.4.2**. 30 entries in `next.jsonl` (10 breaking, 3 deprecation, 17 default-behavior): 21 reused from v3 (same id and summary), 9 new.

## Versions in the window

Stable versions published after 2026-06-30 and on or before 2026-10-19 (npm `time`): 16.2.10, 16.2.11, 16.2.12, 16.3.0–16.3.8, 16.4.0, 16.4.1, 16.4.2 and the 15.5 backport line 15.5.20–15.5.28. No release after 16.4.2 (2026-10-15) up to 2026-10-19. The last stable release before the window is 16.2.9 (2026-06-09); it is the "before" baseline used to decide whether an API existed before the window.

## Sources consulted

- GitHub releases: `gh api repos/vercel/next.js/releases --paginate`, `prerelease == false`, all 24 in-window releases read in full (`https://github.com/vercel/next.js/releases/tag/v<version>`). The 16.3.0 (≈1,600 lines) and 16.4.0 (≈950 lines) bodies are PR-title lists; every "Core Changes" line was scanned and candidate PRs were opened (`gh pr view`). The repo has no CHANGELOG file.
- Release blog posts: https://nextjs.org/blog/next-16-3 and https://nextjs.org/blog/next-16-4 (read in full).
- No major release in the window, so no upgrade guide applies.
- Checks: `packages/next/src/server/config-shared.ts` at v16.2.9, v16.3.0, v16.3.8 and v16.4.2 (removed experimental keys and default changes); `npm pack next@16.2.9` and `next@16.4.2` (exports such as `unstable_catchError`, `unstable_instant`, the HMR path); `packages/next/src/build/segment-config/app/app-segment-config.ts` at v16.3.0/v16.4.0 (instant config shape).
- v3's `bench/heldout-v3/sampling/population/next.jsonl` / `.sources.md`: 84 entries, 21 dated in this window. All 21 were re-checked against the releases above and kept with their v3 ids and summaries; the 63 dated before 2026-07-01 were dropped.

Entries by release: 16.3.0 ×20 (12 from v3, 8 new), 16.4.0 ×9 (8 from v3, 1 new), 15.5.22 ×1 (v3). All come from the release notes and the PRs they list; 5 v3 entries cite the 16.3/16.4 blog post as the more specific source, and the blog posts produced no entry that the notes did not already have except `next-dev-writes-agents-md` (blog + PR #92910).

## What changed relative to v3, and why

v3's window began 2025-08-01, so v3 left out changes to APIs "added inside the window" when those APIs first appeared in 15.5–16.2. In v4 those APIs existed in a stable release before 2026-07-01 (checked in 16.2.9), so changes to them in 16.3/16.4 are now in scope. New entries:

- `16.3.0/catcherror-retry-stabilized`: `unstable_catchError` and `unstable_retry` shipped in 16.2.0; #94610 renames them with no alias.
- `16.3.0/unstable-instant-renamed` and `16.3.0/instant-config-reshaped`: `unstable_instant` (with a required `prefetch: 'static' | 'runtime'` and `samples`/`from`) is in 16.2.9; 16.3.0 reads `instant` with `unstable_samples`/`unstable_from` and no `prefetch` (#94578, #92761). Kept as two entries: one is an export rename, the other a change of the config object's shape (separate migration).
- `16.3.0/experimental-flags-removed-now-default`: keys present in 16.2.9's `ExperimentalConfig` and gone in 16.3.0: `rootParams` (#93863), `turbopackImportTypeText` (#95606), `partialFallbacks` (#92627 then #93859; behavior later gated behind `partialPrefetching`, #96074), `instantNavigationDevToolsToggle` (#94322), `immutableAssetToken` (#92164, #95351) and `imgOptSkipMetadata` (removal not named in any release note; found only in the config diff — included with doubt).
- `16.3.0/vary-params-default` (#94010), `16.3.0/cached-navigations-default` (#94012): both keys exist in 16.2.9 with default `false`.
- `16.3.0/prerender-sourcemaps-default` (#93280): top-level `enablePrerenderSourceMaps` (stable since 16.0) went from on-only-with-`cacheComponents` to `true` for all apps (config.ts v16.2.9 vs v16.4.2). Included with doubt: the effect is on build error output.
- `16.3.0/next-dev-writes-agents-md` (#92910; announced in the 16.3 blog, "Versioned docs for AI agents"): `next dev` now writes into the project's `AGENTS.md`/`CLAUDE.md` when it detects an agent. Included with doubt: a new feature, but it changes what `next dev` does to the user's files by default.
- `16.4.0/appnewscrollhandler-flag-removed` (#95602): the flag is in 16.2.9; v3 left it out only because it was added in v3's window.

## Judgment calls

- **Merged into the spent v3 entry** `16.3.0/experimental-flags-removed-memorylimit-viewtransition` (spent by v3 task `next-viewtransition-flag`) by the session that built the frame, applying the same-kind, same-release rule strictly: the researcher had first kept the other removed experimental keys (listed above as `experimental-flags-removed-now-default`) as a separate entry. The merged entry keeps v3's id, so it remains spent.
- **Reused v3 entries unchanged**, including those v3 marked doubtful (`opengraph-image-return-type-response`, `custom-server-undocumented-methods-deprecated`, `strict-route-matching-default`, `reject-typescript-7`, the Turbopack output-default entries).
- `15.5.22/reject-typescript-7` stays: it is backport-line-only (POPULATION.md step 1).

## Left out, and why

- Patch releases 16.2.10–16.2.12, 16.3.1–16.3.8, 16.4.1–16.4.2 and 15.5.20–15.5.28: security advisories, backported fixes, re-publishes (`@next/swc-wasm-web`), the temporary AVIF disable in 16.3.3/15.5.24 that was reverted a week later, TypeScript 7 support (16.2.12, a feature).
- `/_next/webpack-hmr` → `/_next/hmr` (#91415, first in 16.3.0): dev-only internal WebSocket path, not a public API (same call as v3).
- "Warn that `experimental.useCache` is deprecated" (#96448) and the `@deprecated` tag on it (#92316): the deprecation dates to 16.0.0, before the window.
- Turbopack memory eviction on by default, Node.js streams for rendering (`useNodeStreams` added after 16.2.9), lazy server HMR, disk cache size: performance or dev internals.
- `instantInsights.validationLevel` default (#94312), `appShells`, `partialPrefetching`, `prefetch`/`ensureStatic` segment configs, `navigation()`/`prefetch()` (and their `unstable_` prefix removal, #99241), `force-runtime`→`allow-runtime`, `useExperimentalReact`→`blockingSSR`, `collapseAdapterRoutes`, `agentUpgrade`/`agentFeedback`, `unstable_eager` removal, `supportsImmutableAssets`: all added after 16.2.9 (inside the window).
- `next experimental-analyze` → `next analyze` (16.4.0): the old name is kept as an alias.
- "Always use generateBuildId if set explicitly" (#99147): presented as a fix (closes an issue).
- `forbidden()`/`unauthorized()` stabilization: reverted in the same release (#99734).
- React 19.3 in the App Router (16.4.0): no change to `next`'s React peer range; feature list.
- create-next-app, eslint-config-next, @next/playwright changes: not the `next` package.
