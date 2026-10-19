# next: population sources

Package `next` (repo vercel/next.js), pinned at **16.4.2**. 84 entries in `next.jsonl` (39 breaking, 13 deprecation, 32 default-behavior).

## Versions in the window

Stable versions (no prerelease tag) published after 2025-07-31 and on or before 2026-10-15, from `https://registry.npmjs.org/next` `time` (dates are the npm publish date, UTC; GitHub release timestamps differ by up to a day for 15.5.3, 15.5.23, 16.2.8, 16.2.9 and 16.4.0, and the npm date was used):

- 15.4.x: 15.4.6 (2025-08-06), 15.4.7, 15.4.8, 15.4.10, 15.4.11
- 15.5.x: 15.5.0 (2025-08-20), 15.5.1 … 15.5.28 (2026-10-14) (no 15.5.17; 15.5.12 and 15.5.20 are re-publishes)
- 16.0.x: 16.0.0 (2025-10-22), 16.0.1 … 16.0.11
- 16.1.x: 16.1.0 (2025-12-18), 16.1.1 … 16.1.7 (2026-03-16)
- 16.2.x: 16.2.0 (2026-03-18), 16.2.1 … 16.2.12 (2026-07-25)
- 16.3.x: 16.3.0 (2026-08-03), 16.3.1 … 16.3.8 (2026-09-30)
- 16.4.x: 16.4.0 (2026-10-06), 16.4.1 (2026-10-14), 16.4.2 (2026-10-15)
- Older-line backports also published in the window: 14.2.32, 14.2.33, 14.2.34, 14.2.35, 15.0.5–15.0.8, 15.1.9–15.1.12, 15.2.6–15.2.9, 15.3.6–15.3.9. All of these are security or bug-fix backports of fixes the newest line already had; none produced an entry (see "Backport lines" below).

Canary, beta, rc and preview versions were ignored.

## Sources consulted

### GitHub releases (every stable release in the window)

`gh api repos/vercel/next.js/releases --paginate`, filtered to `prerelease == false` and dates in the window: 91 releases read in full (the 15.5.0, 16.0.0, 16.0.3, 16.1.0, 16.2.0, 16.3.0 and 16.4.0 bodies list PR titles under "Core Changes"/"Misc Changes"; patch releases list backported PRs or security advisories). URLs are `https://github.com/vercel/next.js/releases/tag/v<version>`. The Next.js repository has no CHANGELOG file; the release notes are the changelog.

Entries whose most specific source is a PR named in a release note (36 entries, `source` = the PR URL): 15.5.0 ×2 (#82582, #82172), 15.5.5 (#84650), 15.5.22 (#96110), 16.0.0 ×2 (#84632, #84069), 16.0.3 (#85541), 16.1.0 ×2 (#85834, #86014), 16.1.7 ×2 (#89963, #91478), 16.2.0 ×9, 16.2.2 (#92130), 16.3.0 ×10, 16.4.0 ×5. PR descriptions were read for every PR cited and for ~60 other candidates that were then left out.

### Upgrade guide for version 16

`docs/01-app/02-guides/upgrading/version-16.mdx` on `canary` (fetched raw via `gh api …/contents`), published at https://nextjs.org/docs/app/guides/upgrading/version-16. 35 entries cite a section anchor of this guide. Every section of the guide is accounted for below ("Guide coverage").

Also read for context, no entries: `docs/01-app/02-guides/upgrading/version-15.mdx`, `codemods.mdx` (the 16.0 codemod list: `remove-experimental-ppr`, `remove-unstable-prefix`, `middleware-to-proxy`, `next-lint-to-eslint-cli`), and the codemod sources `packages/next-codemod/transforms/middleware-to-proxy.ts` (for the full list of renamed config keys and types) and `remove-unstable-prefix.ts` (only `unstable_cacheTag` and `unstable_cacheLife`).

### Release blog posts

- https://nextjs.org/blog/next-15-5 — 6 entries (deprecation warnings for 16 and `next lint`, typedRoutes stabilization).
- https://nextjs.org/blog/next-16 — 1 entry sourced here (Babel auto-enable); its Removals / Behavior Changes / Deprecations tables were cross-checked against the guide (all other rows are covered by guide-sourced entries).
- https://nextjs.org/blog/next-16-1 — 1 entry (dev filesystem cache default).
- https://nextjs.org/blog/next-16-2 — 0 entries sourced here (its items are features or are sourced from PRs); read in full.
- https://nextjs.org/blog/next-16-3 — 2 entries (build filesystem cache default, prefetch inlining default).
- https://nextjs.org/blog/next-16-4 — 3 entries (Turbopack shared runtime, export mangling, shorter CSS Module class names).

### Other checks used to date or classify entries

- `packages/next/src/server/config-shared.ts` at tags v15.4.5 (last pre-window stable), v16.0.0 and v16.4.2, and `packages/next/src/shared/lib/image-config.ts` and `packages/next/src/client/app-dir/link.tsx` at v15.4.5/v16.4.2: used to tell pre-window config keys from keys added inside the window, and to confirm which keys were removed versus kept as `@deprecated`.
- npm registry `engines` and `peerDependencies` per version (Node minimum changed at 16.0.0; the React peer range `^18.2.0 || ^19.0.0` did not change in the window, so there is no peer-dependency entry).
- GitHub advisory GHSA-mq59-m269-xvcx (for the 16.1.7 Server Action origin entry).

## Guide coverage (version-16 guide section → entry)

Node.js/TypeScript/browsers → `min-node-20-9-typescript-5-1`, `default-browserslist-updated`; Turbopack by default (+ opting out) → `turbopack-default-bundler`; Turbopack configuration location → `experimental-turbo-removed`; Resolve alias fallback and Sass `~` imports → no entry (pre-existing Turbopack-vs-webpack differences that the default switch exposes, not changes to Next.js APIs; folded into the Turbopack-default entry); Turbopack File System Caching → `turbopack-fs-cache-dev-default` (16.1.0) and `turbopack-fs-cache-build-default` (16.3.0), dated where the default actually flipped; Async Request APIs → `sync-request-api-access-removed`; async params for image routes and async `id` for sitemap → `metadata-route-args-async` (merged: same kind of change to the same kind of file-convention function in one release); React 19.2 → no entry (feature list; the React peer range did not change); React Compiler → `config-keys-promoted-from-experimental`; revalidateTag → `revalidatetag-requires-profile`; updateTag, refresh → no entry (new APIs); cacheLife/cacheTag → `unstable-cachelife-cachetag-stabilized`; Enhanced Routing → `client-segment-cache-default`; PPR → `experimental-ppr-removed`; middleware → proxy (file, export, renamed flags) → `middleware-deprecated-for-proxy` and `middleware-to-proxy-renames`; next/image sections → one entry each (`image-local-query-requires-localpatterns`, `image-minimumcachettl-default-4h`, `image-imagesizes-default-drops-16`, `image-qualities-default-75`, `image-local-ip-blocked`, `image-maximumredirects-default-3`, `next-legacy-image-deprecated`, `images-domains-deprecated`); Concurrent dev and build → `dev-output-dir-next-dev`, `distdir-lockfile` (the changed `next internal trace` path is folded into the first); Parallel Routes default.js → `parallel-routes-require-default-js`; ESLint Flat Config → `eslint-flat-config-default`; Scroll Behavior → `scroll-behavior-no-override`; Performance Improvements (size metrics) → `build-size-metrics-removed`; next dev config load → `config-loaded-once-no-dev-argv`; Build Adapters API (alpha) → no entry at 16.0.0 (new API), but the 16.2.0 promotion is `adapterpath-promoted` because `experimental.adapterPath` already existed in 15.4.5; Modern Sass API → `sass-loader-v16`; Removals: AMP → `amp-removed`, next lint (+ build linting + `eslint` config key) → `next-lint-removed`, Runtime Configuration → `runtime-config-removed`, devIndicators → `devindicators-options-removed`, dynamicIO/useCache → `experimental-dynamicio-usecache-removed`, unstable_rootParams → `unstable-rootparams-removed`; Troubleshooting / checklist → no entries.

## Judgment calls

### Merging (protocol: same kind of change to the same kind of item in one release = one entry)

Merged into one entry, listing the items: the three `devIndicators` options; `unstable_cacheLife` + `unstable_cacheTag`; all middleware→proxy renames of config keys, types and the `routeType` value (one mechanical rename, one codemod); `experimental.dynamicIO` + `experimental.useCache` removal (same replacement); the four config keys promoted out of `experimental` in 16.0.0 (`reactCompiler`, `cacheComponents`, `cacheLife`, `cacheHandlers`); the two Turbopack key renames in 16.0.0; the two 15.5.0 key renames (`typedRoutes`, `dynamicIO`→`cacheComponents`); sync-compat removal across cookies/headers/draftMode/params/searchParams; Promise-wrapped args across image routes and sitemap; Node + TypeScript minimums; `experimental.ppr` + `experimental_ppr` (one feature removed, one migration); `next lint` + build-time lint + `eslint` config key (one feature removed); the two experimental flags removed in 16.3.0; Edge runtime + `preferredRegion` deprecation (one PR, one migration).

Kept separate although they share a release and an area, because each needs a different migration and the guide/blog list them separately: the six `next/image` changes in 16.0.0; the two 15.5.0 `next/image` warnings (qualities vs localPatterns); the experimental flags whose defaults flipped in 16.3.0 (prefetchInlining, optimisticRouting, validateRSCRequestHeaders, appNewScrollHandler, build FS cache, TypeScript CLI) and in 16.4.0 (shared runtime, export mangling, CSS class names) — each has a distinct observable effect. The rule's examples (icons renamed, aliases removed) describe mechanically identical changes; these are not.

### Deprecation → removal pairs

A deprecation and the later removal are two entries when both happened in the window (e.g. `next lint` 15.5.0/16.0.0, AMP 15.5.0/16.0.0, runtime config 15.5.5/16.0.0, `unstable_rootParams` 15.5.0/16.0.0, `dynamicIO` rename 15.5.0 / removal 16.0.0, clientSegmentCache default 16.0.0 / flag removal 16.0.3). `legacyBehavior` on `next/link` has only the 15.5.0 deprecation: the removal attempted in 16.0.0 was reverted (#84500) and the prop is still present (as `@deprecated`) in 16.4.2.

### Type choices

- Promotions of a config key out of `experimental` are typed `breaking` (the protocol counts a renamed config key as breaking) even though Next.js keeps the old key with a deprecation warning; this applies to `config-keys-renamed-typedroutes-dynamicio`, `config-keys-promoted-from-experimental`, `adapterpath-promoted`, `browser-logs-config-renamed`, `middleware-to-proxy-renames`, `turbopack-config-keys-renamed`, `turbopacktreeshaking-renamed`. `unstable_cacheLife/cacheTag` likewise still accept the old names (#84934).
- `client-segment-cache-default` and `scroll-behavior-no-override` are `breaking` because their release-note titles carry `[breaking]`, although the guide says no code change is needed for the first.
- The 16.0.0 `next/image` default changes are `breaking` (guide headings say "(Breaking change)", PR titles say BREAKING) rather than `default-behavior`.
- `revalidatetag-requires-profile` is `breaking` (signature change that is a TypeScript error) although the blog also lists the single-argument form under "Deprecations".
- `image-maximumresponsebody-limit` is `breaking` because of the conventional-commit `!`; the default was later lowered from 300 MB to 50 MB inside the same release (#88588).
- `parallel-routes-require-default-js`, `turbopack-default-bundler` and the other 16.0.0 "Behavior Changes" rows are `default-behavior`.
- `web-vitals-v6-soft-navigations` is `breaking` because the FID metric disappears from `useReportWebVitals` output and the public metric types.

### Included with doubt (the walk can skip them)

- `nextrequest-internals-stripped` (15.5.0): a type-only change to `NextRequest`; may not be user-visible.
- `nextconfig-type-rejects-excess-properties` (16.0.0): TypeScript-only; it makes typos in `next.config.ts` errors.
- `experimental-dynamicio-usecache-removed`: the guide says both flags were removed in 16, but `experimental.useCache` is still typed (`@deprecated`) in 16.4.2 and only got a runtime warning in 16.3.0 (#96448); `experimental.ppr` is likewise still typed as deprecated while its use errors ("hard deprecate", #84280). Dated and typed per the guide.
- `runtime-config-removed`: the removal PR (#83944) was reverted in the 16.0.0 notes (#84167), yet the config types at v16.0.0 no longer contain `publicRuntimeConfig`/`serverRuntimeConfig` and the guide and blog list them as removed; the deprecation warning (#84168) was backported to 15.5.5 and is its own entry.
- `ambiguous-app-routes-build-error` (16.1.0), `strict-route-matching-default` (16.4.0): new build-time validations that make previously tolerated file layouts fail; presented as features, not fixes.
- `use-cache-module-reexports-wrapped` (16.1.0) and `nested-use-cache-requires-cachelife` (16.2.0): `'use cache'` existed before the window behind `experimental.useCache`, so these count as changes to a pre-window API; both only matter with Cache Components enabled.
- `image-disk-cache-lru-limit` (16.1.7): a security fix (CVE-2026-27980) that introduces a bounded cache where there was none; listed as a `feat`, so counted as a default change.
- `server-actions-privacy-sensitive-contexts-blocked` (16.1.7): security fix (GHSA-mq59-m269-xvcx) that changes a default; "privacy-sensitive contexts" in the notes means `Origin: null`.
- `javascript-urls-disallowed` (16.2.0): the PR calls it a bug fix, but it removes a previously working (if unintended) input.
- `taint-without-flag-compile-error`, `dev-cross-origin-requests-blocked`, `plain-text-404-for-non-document-requests`, `typescript-cli-typecheck-default`, `react-browser-bailout-default`, `unrecognized-server-actions-client-errors`: behavior changes presented as changes; some are dev-only or edge-case.
- `tsconfig-no-baseurl-node-moduleresolution` (16.2.2): what changed is the tsconfig Next.js generates/validates; the exact user-visible effect was inferred from PR titles (#91847, #91855, #92277).
- `turbopack-infer-module-side-effects-default`, `turbopack-shared-runtime-default`, `turbopack-export-mangling-default`, `css-module-class-names-shortened`: bundler output defaults (config keys whose default changed); likely S1 in the walk.
- `opengraph-image-return-type-response` (16.3.0): a type narrowing whose other return types never built.
- `custom-server-undocumented-methods-deprecated` (16.3.0): the deprecated methods were undocumented.
- `reject-typescript-7` (15.5.22): the only backport-line-only entry (POPULATION.md step 1: a backport counts only if it changed something the newest line didn't). 15.5.x now errors on TypeScript >= 7 while 16.2.12+ added TypeScript 7 support.

### Left out, and why

- **Bug fixes and security patches** in every patch release (14.2.x, 15.0–15.4.x, 15.5.x, 16.x.y), including CVE-2025-66478, the 2025-12-11 and 2026-01-26 security updates, the May/July/August/September/October 2026 advisories, the temporary disabling of AVIF optimization in 15.5.24/16.3.3 (re-enabled a week later in 15.5.25/16.3.4), `next/og` hardening (16.3.6), http-proxy request-smuggling patches, `maxPostponedStateSize` enforcement, "Don't drop FormData entries", LRU/memory-leak fixes, `staleTimes.static` 30 s minimum (#85479, labeled fix), `revalidatePath` implicit-tag fixes (#84586, #88732, #88623), `fetch` cache-key fixes (#96008, #96009), "Restore the live headers() view" (#97311), "Fix App Router locale path matching" (reverted), "preserve middleware rewrite query in Pages API routes" (#94905, a fix; reverted in 16.3.1).
- **Features that leave existing behavior alone**: `next typegen`, route props helpers (`PageProps`/`LayoutProps`/`RouteContext`), Turbopack builds beta, Node.js middleware stabilization in 15.5 (`runtime: 'nodejs'` no longer needs `experimental.nodeMiddleware`; no existing behavior changed), `next/root-params` (15.5.0), `updateTag`, `refresh`, `next dev --inspect`, `next start --inspect`, `next upgrade`, `next analyze`/`experimental-analyze`, MCP dev server, `transitionTypes`, `unstable_catchError`/`unstable_retry`, `instant()`/Partial Prefetching/`prefetch` segment config/`ensureStatic`/`navigation()`/`prefetch()` (16.3–16.4, all added in the window), `useOffline`, `import.meta.glob`, Rust React Compiler, `images.maximumDiskCacheSize`/`maximumResponseBody` as options (their defaults are the entries), `experimental.strictRouteTypes`, `serverFastRefresh`, `experimental.swcEnvOptions`, `experimental.lightningCssFeatures`, `outputHashSalt`, `supportsImmutableAssets`, `turbopackIgnoreIssue`, `agentUpgrade`/`agentFeedback`, Server Function logging (new dev logging, on by default), `experimental.useExperimentalReact`/`blockingSSR`.
- **Changes only to APIs added inside the window**: `experimental.clientParamParsing` (added 15.5.0, removed 16.0.0), `experimental.rdcForNavigations`, `experimental.isolatedDevBuild` (added and removed in-window), `experimental.lockDistDir`, `experimental.enablePrerenderSourcemaps` (not in 15.4.5; stabilized 16.0.0), `experimental.middlewareClientMaxBodySize`→`proxyClientMaxBodySize` (added 15.5.5), `prefetch="unstable_forceStale"` on Link (added after 15.4.5, removed 16.0.1), `experimental.devCacheControlNoCache`, `experimental.turbopackIgnoreIssue` move, `unstable_prefetch`→`unstable_instant`, `experimental.appNewScrollHandler` flag removal in 16.4.0 (the flag was added 16.2.0; its default flip in 16.3.0 is an entry because it changes pre-existing navigation behavior), `experimental.useNodeStreams` default/removal (rendering internals, perf), `experimental.reactDebugChannel` default, `experimental.varyParams`/`cachedNavigations`/`appShells`/`partialFallbacks` defaults (added in-window and gated on `cacheComponents`), `unstable_io` stabilization, `catchError`/`retry` and `unstable_instant` stabilizations, `unstable_eager` removal, `experimental.agentUpgrade` option changes, `next experimental-analyze`→`next analyze`, `rootParams` enabled by default (#93863; `next/root-params` was added 15.5.0).
- **Not `next`**: `@next/mdx` `useMDXComponents` argument removal (15.5.0), `eslint-config-next` bumping `eslint-plugin-react-hooks` to v7 and supporting ESLint 10, create-next-app defaults (Cache Components, Biome, templates). The ESLint flat-config default is kept as an entry because the version-16 guide lists it, with the caveat that it lives in `@next/eslint-plugin-next`/`eslint-config-next`.
- **Reverted inside the window**: `[Breaking] Skip Next.js internal routes /_next in middleware` (reverted before 16.0.0 shipped), `legacyBehavior` removal (#84500 re-enabled it), "Move next-env.d.ts to dist dir", "keep next-env.d.ts unchanged between dev and build", `Replace build id in Pages data routes with deployment id`, `Stabilize forbidden() and unauthorized()` (16.4.0, reverted in the same release), Turbopack CJS tree shaking default (reverted), shared runtime "only on canary" then re-enabled (#99504 is the entry), i18n Pages API change (#94905) reverted in 16.3.1.
- **Performance, dev-tooling, cosmetic or CLI-output only**: Turbopack memory eviction, Node streams, faster rendering, `/_next/webpack-hmr`→`/_next/hmr` rename (dev-only internal endpoint), trace/profile paths moved to `.next-profiles`, redesigned default error pages (#87988, #90469), terminal output redesign, request log timing, `GPTBot` added to the known-bots list (#89188), "removing length requirement" for deploymentId (#89173), `Limit number of server action arguments to 1000`, postponed-body size limit, `Normalize and validate expire and revalidate values` (validation of invalid input), `Add some more verification and safety rules around custom distDir` (only rejects catastrophic configs, per PR), `Handle pnpm-workspace.yaml`/worktree root detection, `useEffectEvent` disallowed in Server Components (React 19.2 API, released inside the window), TTL-based caching of Turbopack's internal fetches (#93228, affects only Turbopack's own requests such as Google Fonts), `Enable eviction by default`, `Rspack persistent cache by default` (next-rspack integration).
- **Dependency bumps not marked breaking**: sharp, swc, lightningcss, path-to-regexp 6.3.0 (15.5.0), tar, lodash, `@vercel/og`/satori, `@types/react`. `sass-loader` v16 is an entry because its PR is marked `[Breaking]` and the guide has a section for it.
- **React 19.2 / 19.3**: the App Router's bundled React canary moved to 19.2 (16.0.0) and 19.3 (16.4.0), but `next`'s React peer range did not change and the guide presents it as a feature list; no entry.

### Backport lines

Versions on the 14.2, 15.0, 15.1, 15.2, 15.3 and 15.4 lines published in the window carry only security backports (and two router fixes), none of which changed anything the newest line did not already have. The 15.5 line (15.5.1–15.5.28) carries backported fixes plus three items that are entries: the runtime-config deprecation warning (15.5.5, which is where it first shipped stable), and `reject-typescript-7` (15.5.22, backport-line-only). `images.maximumDiskCacheSize` reached 15.5.14 on 2026-03-19, after 16.1.7 (2026-03-16), so the entry is dated 16.1.7.
