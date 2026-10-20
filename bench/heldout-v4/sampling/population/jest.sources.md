# jest: sources and judgment calls

Package `jest` (repo jestjs/jest, monorepo). Pinned version **30.5.2**. As in v3, the monorepo's runtime, config, resolver, environment and utility packages (`jest-runtime`, `jest-config`, `jest-resolve`, `@jest/source-map`, `@jest/environment-jsdom-abstract`, ...) are treated as part of `jest`.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19 (`npm view jest time --json`, UTC):

| version | npm publish date |
|---|---|
| 30.5.0 | 2026-08-28 |
| 30.5.1 | 2026-09-01 |
| 30.5.2 | 2026-09-18 |

The last stable before the window is 30.4.2 (2026-05-09). No prereleases or backport lines in the window.

## Sources consulted

| source | entries |
|---|---|
| `npm view jest time --json` | version list and dates |
| https://github.com/jestjs/jest/blob/v30.5.2/CHANGELOG.md, sections 30.5.2, 30.5.1, 30.5.0, read in full | 9 |
| GitHub releases v30.5.0, v30.5.1, v30.5.2 (`gh api repos/jestjs/jest/releases --paginate`): bullets identical to the changelog; the v30.5.0 highlight prose (whenCalledWith, describe retries, new watcher, dependency updates, performance, ESM, resolver) restates changelog bullets | 0 new |
| No major release in the window, so no migration guide applies (https://jestjs.io/docs/upgrading-to-jest30 covers 30.0, pre-window) | 0 |
| PRs #16368 (type:commonjs + ESM syntax), #16152 and issue #16144 (ESM-syntax fallback fix) | summary and the 30.5.0 judgment below |
| v3's `bench/heldout-v3/sampling/population/jest.jsonl` and `.sources.md` | ids reused |

Total: **9 entries**: 6 `default-behavior`, 1 `deprecation`, 2 `breaking`.

## Reuse of v3

v3 covered jest through 2026-10-15 with 11 entries. Its three 30.4.0 entries (`esm-syntax-js-loaded-as-esm`, `import-attributes-validated-json-warning`, `cjs-from-esm-interop`) are dated 2026-05-07, before the v4 window, and are dropped. Its seven 30.5.0 entries and one 30.5.1 entry are the same changes, first shipped in-window, and keep v3's ids and summaries: `process-getbuiltinmodule-sandboxed`, `module-register-throws-in-test`, `esm-graph-errors-before-cjs-execution`, `module-sync-condition-resolved`, `preserve-symlinks-honored`, `source-map-getcallsite-deprecated`, `types-jsdom-peer-dependency`, `project-config-global-only-options`. I re-read all three in-window releases myself and agree with v3's reading of them, including its unsure calls (module-sync, preserve-symlinks, the @types/jsdom peer, typing the 30.5.1 project-config change `breaking`). No release after 2026-10-15 exists up to the pin.

## New entry versus v3, and why

The window moved, and 30.4.x is now before it. v3 left some 30.5.0 bullets out because they changed behavior that 30.4.0 itself had added (an in-window API for v3). For v4 that 30.4.0 behavior is pre-window, so I re-checked those bullets:

- Included, new id `jest@30.5.0/commonjs-package-esm-syntax-throws` (default-behavior, unsure): "[jest-resolve, jest-runtime] Throw the CJS parse error for ESM syntax in a `"type": "commonjs"` package or a `.cjs` file instead of loading it as ESM, matching Node" (#16368, under Fixes). Since 30.4.0 such files silently loaded as ESM; now they throw. It is in a Fixes section, but input that worked in the last pre-window release now fails, and the PR describes it as a deliberate behavior alignment. v3 folded this into its 30.4.0 entry; that entry is out of the v4 window, so it gets its own entry here.
- Left out: "Fall back to native ESM when a `.js` file contains ESM syntax but has no `"type":"module"` marker" (#16152): it fixes issue #16144 (a regression in the 30.4.x fallback); a fix, and the fallback itself is 30.4.0.
- Left out: "Emit the JSON-without-import-attribute deprecation warning once per test file instead of once per worker": the warning is from 30.4.0 (pre-window); only how often it's printed changes (logging).
- Left out: the require(esm) follow-ups (`__esModule: true` live-binding facade and the same object in `require.cache` (#16367), `ERR_REQUIRE_CYCLE_MODULE`, `ERR_REQUIRE_ASYNC_MODULE` on retry and under async-only resolvers, hiding failed modules from `require.cache`, the transform fallback on Node < 24.9). require(esm) shipped in 30.4.0, so these are no longer excluded as in-window APIs. But they are listed under Fixes as Node-parity fixes and mostly affect input that crashed or misbehaved. The `__esModule` facade is the closest call: it adds a property to what `require()` of an ESM file returns; left out as a fix, noted here.

## Other judgment calls (same as v3, rechecked)

Left out from 30.5.0: automocking ESM on Node 24.9+ (previously failed, feature); `import.meta.main`, the `'module.exports'` named export, `import.meta.resolve` in `data:` URIs (additions); error-message bullets (`ERR_SOURCE_PHASE_NOT_DEFINED`, the `{virtual: true}` hint, actionable `ERR_REQUIRE_ESM`); non-null `require.main` for the test file, ESM mock scoping inside `isolateModules`, `moduleFileExtensions: ['js']` no longer matching `foo.mjs` (fixes, noted as borderline); `moduleNameMapper` for both core-module spellings (#16390, reverted in 30.5.1 before the pin); removal of `jest-pnp-resolver` in favor of unrs-resolver (not presented as a behavior change); watcher and crawler replacements, performance and dependency updates; `whenCalledWith`, describe-level retries, `retryMessages`, `unhandledErrorsDetailed`, `--collectTests` expansion, snapshot paths (features); type widenings in `expect` and `jest-mock`.

Left out from 30.5.1: the global-only-options warning fix, `#imports` under ESM, the `moduleNameMapper` revert (fixes); renaming the `JEST-01` warning text (the warning dates from 30.0.0).

Left out from 30.5.2: Node type stripping when no transformer claims a `.ts` file (a file that failed now runs: a feature); the three fixes.
