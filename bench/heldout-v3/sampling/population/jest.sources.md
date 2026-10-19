# jest: sources and judgment calls

Package `jest` (repo jestjs/jest, monorepo). Pinned version **30.5.2**. Per the brief, the monorepo's runtime, config, resolver, environment and utility packages (`jest-runtime`, `jest-config`, `jest-resolve`, `@jest/globals`, `expect`, `jest-environment-node`, `jest-util`, `@jest/transform`, `@jest/source-map`, `jest-environment-jsdom-abstract`, …) are treated as part of `jest`; changelog bullets are prefixed with the sub-package in brackets.

## Version range

Stable `jest` versions published after 2025-07-31 and on or before 2026-10-15, from `npm view jest time --json` (UTC):

| version | npm publish date |
|---|---|
| 30.1.0 | 2025-08-27 |
| 30.1.1 | 2025-08-27 |
| 30.1.2 | 2025-09-01 |
| 30.1.3 | 2025-09-02 |
| 30.2.0 | 2025-09-28 |
| 30.3.0 | 2026-03-10 |
| 30.4.0 | 2026-05-07 |
| 30.4.1 | 2026-05-08 |
| 30.4.2 | 2026-05-09 |
| 30.5.0 | 2026-08-28 |
| 30.5.1 | 2026-09-01 |
| 30.5.2 | 2026-09-18 |

No prereleases in the window. The last pre-window stable is 30.0.5 (2025-07-16).

## Sources consulted

| source | entries |
|---|---|
| `npm view jest time --json` | version list and dates |
| https://github.com/jestjs/jest/blob/v30.5.2/CHANGELOG.md, sections 30.5.2 down to 30.1.0 (the unreleased "main" section ignored), read in full | 11 |
| GitHub releases v30.1.0 … v30.5.2 (`gh api repos/jestjs/jest/releases --paginate`), bullets diffed against the changelog: identical apart from the v30.4.0 and v30.5.0 highlight prose (which restates changelog bullets) and PR-vs-issue link differences in v30.1.0 | 0 new |
| jestjs.io blog index, pages and RSS: the newest post is "Jest 30" (2025-06-04); no post covers a window version | 0 |
| https://jestjs.io/docs/configuration (the `globalsCleanup` / `JEST-01` text), https://jestjs.io/docs/upgrading-to-jest30 (exists; describes 30.0 changes, all pre-window) | 0 |
| PRs #16050 (CJS-from-ESM interop), #16143 (default-export alignment), #16127 (import attributes), #16260 (preserve-symlinks), #16336 (module-sync), #16411 (project-config options), #15849 (case-sensitive `jest.mock()` docs) | used for summaries and dating |
| History of `packages/jest-util/src/garbage-collection-utils.ts` and the file at tag v30.0.0: the `JEST-01` warning code exists since 30.0.0 | settles that JEST-01 is pre-window |

Total: 11 entries: 7 `default-behavior`, 2 `deprecation`, 2 `breaking`.

## How the rules were applied

- The brief counts new deprecation warnings, changed defaults, changed resolution/interop behavior that the notes present as a change, and removed or renamed config options; pure fixes, perf, docs and refactors do not count.
- Jest files most behavior changes under "Fixes". A Fixes bullet was included only when it changes a default, removes/renames something, or describes resolution/interop now doing X instead of Y for input that used to succeed (not for input that used to crash). Features that make a previously failing input work (require(esm), automocking ESM, type-stripping `.ts`) were treated as features and left out. The borderline cases are listed so the line can be checked.
- Changes to behavior that 30.4.0 itself introduced (require(esm) semantics, the ESM-syntax fallback's scope, the import-attribute warning's frequency) are folded into the 30.4.0 entry's summary rather than listed separately, per the in-window-API rule.

## Judgment calls, 30.1.0 – 30.3.0

No entries.
- 30.1.0–30.1.3: all fixes. The goo.gl snapshot-link warning bullets fix a deprecation introduced in 30.0 (pre-window). "Reduce redundant ReferenceError messages" is message wording. "Include test modules that failed to load when --onlyFailures is active" is CLI behavior under Features; a fix in substance.
- 30.2.0: JSDOM 27 support (peer range widened), fixes.
- 30.3.0: `defineConfig`/`mergeConfig` and `setTimerTickMode` are new APIs. "[*] Reduce token usage when run through LLMs" changes CLI output only; left out (would be S1 anyway). "[*] Replace remaining micromatch uses with picomatch" is a chore not presented as a behavior change, noted because glob semantics could differ at the edges. "Update to sinon/fake-timers v15" is a dependency bump not marked breaking. "[docs] Update V30 migration guide … `jest.mock()` … case-sensitive path" documents a change that #15849 traces to 30.0.0-beta.6, so pre-window. "Make sure process.features.require_module is false" is a fix.

## Judgment calls, 30.4.0 – 30.4.2

Included:
- `jest@30.4.0/esm-syntax-js-loaded-as-esm` (default-behavior): "[jest-runtime] Load `.js` files with ESM syntax but no `"type":"module"` marker as native ESM" (Fixes, #16050) plus "Extend the `.js`-with-ESM-syntax fallback to `require()` on Node v24.9+" (#16078). Presented as resolution/interop now doing something different for files that previously failed to parse as CJS. The 30.5.0 bullets "Fall back to native ESM when a `.js` file contains ESM syntax…" (#16152, the same change) and "Throw the CJS parse error for ESM syntax in a `"type": "commonjs"` package or a `.cjs` file instead of loading it as ESM" (#16368, a narrowing of this in-window behavior) are folded into the summary. Unsure whether "previously a syntax error" makes this a feature; included.
- `jest@30.4.0/import-attributes-validated-json-warning` (deprecation): "[jest-runtime] Validate TC39 import attributes" (Features, #16127). The PR adds a `console.warn` ("Jest: importing JSON without an import attribute is deprecated and will be a hard error in the next major") and throws for unsupported attributes or a type mismatch. 30.5.0's "Emit the JSON-without-import-attribute deprecation warning once per test file instead of once per worker" adjusts this in-window warning and is folded in.
- `jest@30.4.0/cjs-from-esm-interop` (default-behavior, unsure): "[jest-runtime] Improve CJS-from-ESM interop: `__esModule`/Babel default unwrap, broader named-export coverage, and shared CJS singleton across importers" (Fixes, #16050). Phrased as an improvement, but it changes what `import x from './cjs'` and named imports of CJS yield for modules that loaded before. 30.4.1's "Align CJS-from-ESM default export with Node: `module.exports` is always the ESM default, `__esModule` unwrapping is no longer applied" (#16143) reverts the unwrap part added here, so it is not a separate entry; 30.4.2's "Fix named imports from CJS modules whose `module.exports` is a function" is a fix to the same work. The summary states the net behavior at the pinned version.

Left out:
- "[jest-runtime] Support `require()` of ES modules on Node v24.9+" (Features, #16074): previously threw `ERR_REQUIRE_ESM`; a feature. The later require(esm) fixes in 30.5.0 (`__esModule` facade, `ERR_REQUIRE_CYCLE_MODULE`, `ERR_REQUIRE_ASYNC_MODULE`, `require.cache` hiding, transform fallback on Node < 24.9) change this in-window feature.
- "[jest-runtime] Use synchronous `evaluate()` for ES modules without top-level `await` on Node 24.9+" and the chore "Use synchronous `linkRequests` / `instantiate`": internal evaluation strategy.
- "[jest-config, jest-core, jest-reporters, jest-runner] `verbose` and `silent` can now be set per-project": a project-config key that was ignored is now honored; a feature, and reporter output only.
- "[jest-config, jest-runner, jest-worker] Add `workerGracefulExitTimeout`", "Add support for `jest.config.mts`", "Add `--collect-tests`", "Add `clearMocksOnScope`", "Add `canResolveSync()`", "Add `canTransformSync`", "Add `isError`", Temporal support in fake timers, React 19 in pretty-format, "Export `GlobalConfig` and `ProjectConfig`", 30.4.1's tuple-format runner options: features.
- "[jest-config] Project config validator now emits 'is not supported in an individual project configuration' instead of 'probably a typing mistake'": message wording. "Allow `collectCoverage` and `coverageProvider` in project config without a validation warning": a fix that removes a warning.
- "[jest-reporters] Apply global coverage threshold to unmatched pattern files" and "[jest-runtime] Apply `moduleNameMapper` when resolving modules with `require.resolve()` and the `paths` option": fixes that can change outcomes for existing configs; left out as fixes, noted.
- "[jest-runtime] Fix error when `require()` is called after the Jest environment has been torn down" / "Fix missing error when `import()` is called after teardown": fixes.
- "[@jest/fake-timers] Upgrade `@sinonjs/fake-timers`": dependency bump.

## Judgment calls, 30.5.0

Included:
- `jest@30.5.0/process-getbuiltinmodule-sandboxed` (default-behavior): "[jest-runtime] Route `process.getBuiltinModule` through the sandbox … instead of the host's" (Features); same input, different result, presented as a change.
- `jest@30.5.0/module-register-throws-in-test` (default-behavior): "[jest-runtime] Throw an actionable error from `module.register()` and `module.registerHooks()` inside a test" (Features); a call that silently did the wrong thing now throws.
- `jest@30.5.0/esm-graph-errors-before-cjs-execution` (default-behavior): "[jest-runtime] Surface resolution and import-attribute errors in an ESM graph before executing any of its CJS dependencies on Node 24.9+" (Features); evaluation-order change, Node 24.9+ only.
- `jest@30.5.0/module-sync-condition-resolved` (default-behavior): "[jest-runtime] Resolve the `module-sync` export condition" (Features, #16336): a resolution change; before, such a package failed with Cannot find module, so this is close to a feature. Unsure; included because a package that also has an `import` branch now resolves to a different file than the ESM condition set would pick.
- `jest@30.5.0/preserve-symlinks-honored` (default-behavior, unsure): "[jest-resolve] Honor Node's `--preserve-symlinks` / `NODE_PRESERVE_SYMLINKS`" (Features, #16260): with the flag set, resolution now differs (no realpath); a feature in form, a resolution change in effect.
- `jest@30.5.0/source-map-getcallsite-deprecated` (deprecation): "[@jest/source-map] Deprecate `getCallsite` in favour of `SourceMapSupport#getCallsite`" (Chore & Maintenance). A public export of a monorepo package; included as a deprecation. Whether it carries a `@deprecated` tag or a runtime warning is for the walk (S7).
- `jest@30.5.0/types-jsdom-peer-dependency` (breaking, unsure): "[@jest-environment/jsdom-abstract] Make `@types/jsdom` a peer dependency" (Fixes). A new peer the project must satisfy, under a Fixes heading, on a package the brief does not name explicitly; included because the protocol counts peer-dependency requirements and the brief says to include when unsure. Likely S4.

Left out:
- "[jest-runtime] Apply automocking and manual `__mocks__` files to synchronously evaluable ESM graphs on Node 24.9+": previously failed with "Attempting to import a mock without a factory"; a feature.
- "[jest-runtime] Set `import.meta.main`", "Provide a CommonJS module's exports under the `'module.exports'` named export when imported from ESM" (and the duplicate "Support CJS-in-ESM exports via `"module.exports"` named exports", #16277), "Provide `import.meta.resolve` and `import.meta.jest` in `data:` URI modules": additions.
- "[jest-runtime] Throw `ERR_SOURCE_PHASE_NOT_DEFINED` with an actionable message", "Point at `{virtual: true}` when `jest.mock` … cannot be resolved", "Surface actionable `ERR_REQUIRE_ESM` error": error-message wording.
- "[jest-runtime] Give the test file itself a non-null `require.main`" (Fixes): observable to code that checks `require.main === module`, but presented as a fix; noted.
- "[jest-runtime] Scope module mocks instantiated inside `jest.isolateModules` to that block … matching how CommonJS mocks already behave": a fix aligning ESM with CJS.
- "[jest-runtime] Key ES modules by full URL", "Share modules between overlapping graphs", "Check a cached ES module's status before `require()` returns it", and the rest of the require(esm)/data:-URI/JSON-module bullets: fixes, or changes to in-window require(esm).
- "[jest-haste-map] Match watched files on a full extension, so `moduleFileExtensions: ['js']` no longer accepts `foo.mjs`" (Fixes): changes which files a config matches, but presented as a fix of over-matching; noted.
- "[jest-resolve] Apply `moduleNameMapper` consistently to both spellings of core module specifiers" (#16390): reverted in 30.5.1 (#16417) before the pinned version; no net change.
- "[jest-resolve] Bump `unrs-resolver` to 1.12.1, remove `jest-pnp-resolver` and unnecessary checks" (Features): removes the Yarn PnP shim in favor of unrs-resolver's own support; not presented as a behavior change; noted.
- "[jest-haste-map] Replace `NodeWatcher` and `FSEventsWatcher` with `@parcel/watcher`", "Drop `walker` … `fdir`", the watchman socket caching: watch-mode internals.
- "[jest-resolve, jest-config, jest-runner] Support a user resolver written as an ES module", `whenCalledWith`, describe-level retries, `retryMessages`, `unhandledErrorsDetailed`, `--collectTests` expansion (an option added in 30.4.0), snapshot paths in failure details: features.
- "[expect] Widen `toMatchObject` and `objectContaining` parameter type … to `object`", "[jest-mock] `mockResolvedValue` / `mockRejectedValue` now see all overload return types": type loosening.
- "[jest-snapshot] Keep a skipped or failed test's hinted snapshots, instead of reporting them obsolete", "[jest-circus] Capture the error listeners of the parent process", "[jest-environment-node, jest-util] Only warn about a conflicting `globalsCleanup` mode when one was explicitly configured", the cache-key, haste-map, source-map and reporter bullets: fixes.
- "[jest-config, @jest/reporters, jest-runtime] Update `glob` to v13", "[babel-jest, @jest/transform] Update `babel-plugin-istanbul` to v8", "[jest-runner, @jest/source-map] Replace `source-map-support`": dependency and internal changes not marked breaking.

## Judgment calls, 30.5.1

Included:
- `jest@30.5.1/project-config-global-only-options` (breaking, unsure on type): "[jest-config, jest-types] Stop accepting `reporters`, `coverageReporters`, `workerIdleMemoryLimit`, `cwd` and `runnerOptions` in a project config … now warn like the other global-only options" and "[jest-config, jest-validate] Warn about `maxWorkers` and `coverageThreshold` in a project config instead of dropping them without a word" (both Fixes, #16411). One entry: changes of the same kind to items of the same kind in one release. Typed `breaking` because keys are removed from the project-config types (a TypeScript project config listing them stops type-checking); the runtime effect is a new warning. `runnerOptions` was added in 30.4.1, inside the window; the other six keys predate it.

Left out:
- "[jest-config] Don't warn about global-only options in the config that supplies the global config", "[jest-runtime] Resolve package `imports` specifiers like `#dep` under ESM again", the `moduleNameMapper` revert: fixes.
- "[jest-util] Name the `testEnvironmentOptions.globalsCleanup` option and link the docs from the `JEST-01` deprecation warning": the JEST-01 warning has existed since 30.0.0 (`garbage-collection-utils.ts` at v30.0.0 line 152), so this only rewords a pre-window warning.

## Judgment calls, 30.5.2

No entries.
- "[@jest/transform] Strip TypeScript types with Node when no transformer claims a `.ts`, `.mts` or `.cts` file" (Features): the default transform claims `.ts`, so this only affects configs whose transform does not; for them an untransformed `.ts` file went from a syntax error to running. Treated as a feature; noted.
- The three Fixes (bundled `package.json` version, `jest-each` key escaping, Windows source-map paths): fixes.
