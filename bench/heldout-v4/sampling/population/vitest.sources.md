# vitest: sources and judgment calls

Package `vitest` (repo vitest-dev/vitest, monorepo). Pinned version **5.0.5**.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19 (`npm view vitest time --json`, UTC):

| version | npm publish date | line |
|---|---|---|
| 3.2.7 | 2026-07-06 | backport |
| 4.1.10 | 2026-07-06 | backport |
| 4.1.11 | 2026-08-18 | backport |
| 5.0.0 | 2026-09-03 | new major |
| 5.0.1 | 2026-09-15 | |
| 5.0.2 | 2026-09-25 | |
| 5.0.3 | 2026-09-30 | |
| 5.0.4 | 2026-10-12 | |
| 5.0.5 | 2026-10-15 | pinned |
| 4.1.12 | 2026-10-15 | backport |

Prereleases 5.0.0-beta.1 to rc.4 (2026-04-23 to 2026-08-31) count only through 5.0.0, so every v5 change is dated 5.0.0 (2026-09-03). 5.1.0-beta.1 (2026-10-19) is a prerelease and is ignored.

Backports: 3.2.7, 4.1.10, 4.1.11 and 4.1.12 contain only bug fixes marked "[backport to v3/v4]" (fs access checks in browser commands, a vm resolve fix, the global concurrency limit, iframeId encoding, browser gc, redirect-mock fs allowlist, hardened manual/redirect mocks). None changes something the 5.x line didn't, so they add no entries.

Pre-window 4.1.x stables were checked so nothing is dated in-window that shipped earlier: the 5.0.0 notes compare against v4.1.5. 4.1.6 (2026-05-11) already shipped the deprecation of `test.sequential`/`describe.sequential`/`sequential` (#10196), so that deprecation is pre-window; only its removal in 5.0.0 is an entry. 4.1.7 to 4.1.9 contain only fixes. The entry points removed in 5.0.0 were deprecated in 4.1.0 (pre-window).

## Sources consulted

| source | entries |
|---|---|
| `npm view vitest time --json`; `npm view vitest@{4.1.9,5.0.0,5.0.5} dependencies.vite peerDependencies engines.node` | dates; Node/Vite requirements and vite moving to peer-only |
| GitHub releases (`gh api repos/vitest-dev/vitest/releases --paginate`): v5.0.0 (full notes: Breaking Changes, Features, Bug Fixes, Performance), v5.0.1 to v5.0.5, the backports, and v5.0.0-beta.1 to rc.4 (checked that their breaking items match the 5.0.0 list and nothing was reverted) | 52 total, merged with the guide |
| Changelog file: vitest keeps no CHANGELOG.md; the GitHub releases are the changelog | 0 |
| Migration guide at v5.0.5: https://vitest.dev/guide/migration/ (`docs/guide/migration/index.md`), every section | 41 sections, merged into the entries |
| Release blog post https://vitest.dev/blog/vitest-5 (`docs/blog/vitest-5.md`) | 0 new (it restates the guide) |
| PRs #9745, #10293, #10334, #10511, #10685, #10709, #10734, #10178, #10222, #11086, #11087, #11088, #11435, #11525, commit 2ce29d5fa (#11214), issues #9124/#9363, `docs/guide/reporters.md` at v5.0.5 | summaries, and the calls below |

Total: **52 entries**: 49 at 5.0.0, 1 at 5.0.1, 2 at 5.0.4. By type: 36 `breaking`, 10 `default-behavior`, 6 `deprecation`.

## How entries were cut

- Migration-guide sections and 5.0.0 "Breaking Changes" bullets were matched up. Each change is one entry. Typing: a changed default value is `default-behavior` (clearMocks, extends, sharedViteServer, locators.exact, artifact paths, json/junit output, list static parse, Temporal faking, and 5.0.4's fsModuleCache and browser-workers changes), a deprecation is `deprecation`, everything else in the guide or under Breaking Changes is `breaking`.
- Split: the guide's "Generated Reports and Artifacts" section became three entries: default paths moved to `.vitest/` (attachments, failure screenshots, blob, html: same kind, one entry), json/junit writing files instead of stdout (a different behavior), html reporter `outputFile` -> `outputDir` (an option rename). "Benchmarking API Rewrite" became three: the top-level `bench` export and `bench.skip/only/todo` removed; the benchmark config options and CLI flags removed (one entry listing them); `Vitest.mode` always `'test'`. "Assertion Types" became two: the `Assertion<R, T>`/`Matchers<R, T>` type parameters, and global `jest.Matchers` no longer read. "Test Titles ... pretty-format" became two: loupe -> pretty-format (with the new truncation option folded in) and unquoted `$` string values (#10170, a separate breaking bullet). "browser.api" became two: `browser.api` deprecated and ignored, and the startup warning for the already deprecated `browser.isolate`.
- Merged: #10654 + #10757 (Temporal under fake timers and under `setSystemTime`) into one entry; #10293 ("don't emit localStorage warnings on Node 26", marked `fix!`) is the `populateGlobal` descriptors change in the guide; #10846 (nested projects) with the `projects` key removed from the inline `ProjectConfig` type; #10583 (UI token) with #10971 (auth for the coverage report and UI subtree).

## Judgment calls

Included, unsure:
- `vitest@5.0.0/browser-iframe-scale` (breaking): "**browser**: Iframe scale" (#9745, `fix(browser)!`), not in the migration guide. From the PR's files and the issues it fixes (#9124, #9363): screenshots were taken from a scaled-down iframe. The summary is my reading of that; check it if drawn.
- `vitest@5.0.0/attachmentsdir-root-only` (breaking): "Make `attachmentsDir` root only config" (#10334) is under Bug Fixes, but it stops honoring a per-project option, and the PR calls it "breaking-ish".
- `vitest@5.0.0/browser-isolate-startup-warning` (deprecation) and `vitest@5.0.1/deps-optimizer-web-warning` (deprecation): both options were deprecated before the window. What's new in the window is the runtime warning. Included because the notes and guide say "deprecated" and the warning is new; the walk can skip under S7/S5 if it's judged pre-window.
- `vitest@5.0.0/experimental-fsmodulecache-deprecated`, `vitest@5.0.0/experimental-api-methods-deprecated` (deprecation): listed as Features ("Promote ... out of experimental"). The PRs say the old `experimental.*` options and `experimental_*` methods remain as deprecated aliases that warn. Experimental APIs, but public and pre-window.
- `vitest@5.0.4/fsmodulecache-default-on` (default-behavior): "Enable fsModuleCache by default" (#11435) is under Bug Fixes, but a default value changed, which the protocol counts in any section. The top-level option name is new in 5.0.0, but the cache (`experimental.fsModuleCache`, default off) predates the window.
- `vitest@5.0.4/browser-instances-as-workers` (default-behavior): "Run browser instances as workers" (#11525) is under Bug Fixes, but carries a ⚠️ note that fewer browser instances open by default and custom `maxWorkers` now means something different.
- `vitest@5.0.0/list-static-parse-default` (default-behavior): marked breaking (#11088). It also changes the default of the programmatic `vitest.collect()`, so it isn't CLI-only.
- `vitest@5.0.0/vite-peer-dependency-only` (breaking): from the guide's "Yarn Users Must Install vite Explicitly" (added by docs PR #11234) and confirmed in npm metadata: 4.1.9 lists `vite` in `dependencies`, 5.0.0 only in `peerDependencies`. Kept separate from the Node/Vite minimum-version entry.

Left out:
- The guide's "`render` Is Async in `vitest-browser-vue` and `vitest-browser-svelte`": these are separate packages, not `vitest`.
- 5.0.0 Bug Fixes that change outcomes but are framed as fixes: "Apply cjs interop for truthy `__esModule`" (#10363), "coverage: `exclude` to not inherit negation globs from `test.include`" (#10299), "snapshot: Fail test when snapshot assertion is used with `test.fails`" (#10090), "Treat empty string as valid snapshot", "Reject when `toMatchFileSnapshot` uses same snapshot file as `toMatchSnapshot`", "Apply queued mocks from doMock() in queue order", "Disallow filter-only options in getBy* locators", "Test `tags` options should overwrite inherited suite options", "Remove broken `./src/*` export from package.json" (#10918: the export never worked), "Add a warning if inline project has duplicate plugins" (a warning that goes with the `extends` default).
- "Add toggable `injectCjsGlobals` option" (#10709): new option whose default keeps the old behavior (the PR hopes to flip it in Vitest 6).
- "Serve warm modules ... enable the node compile cache" (#10708) followed by "Make the Node compile cache opt-in" (#10742): both in 5.0.0 prereleases, so no net default change at 5.0.0. Other performance work, including bundling vitest's own dependencies (#10685).
- "Update fake-timers to 15.3.2. support `toNotFake`" and 5.0.1 "Force `queueMicrotask` and `nextTick` in `toNotFake`": `toNotFake` is new in the window (the 5.0.0 compare base is 4.1.5 and no 4.1.x shipped it).
- Performance hints printed by default (blog post): new CLI output.
- 5.0.1 to 5.0.5 bug fixes, apart from the three included above. Noted: 5.0.4 "Fail the run on git and location filter errors" (#11430) and "Refactor caching ... change the shape of `results` cache" (#11453, internal cache file); 5.0.5 "Set `skip` in `skipIf`, ignore `undefined` options".
- 5.0.0 Features: all additive (`vi.when`, `--repeats`, `createReport`, nested-project features, trace view, `-p` shorthand, `coverage.autoAttachSubprocess`, the switch to `@vitest/istanbuljs`, etc.).
