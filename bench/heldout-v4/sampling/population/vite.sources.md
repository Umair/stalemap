# vite: population sources

Package `vite` (repo vitejs/vite, `packages/vite`). Pinned version 8.3.4. Built 2026-10-20 following [POPULATION.md](../POPULATION.md). No v3 population exists for vite.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19, from `npm view vite time --json` (UTC):

| version | npm publish date | entries |
|---|---|---|
| 8.1.3 | 2026-07-02 | 0 |
| 8.1.4 | 2026-07-09 | 0 |
| 8.1.5 | 2026-07-16 | 0 |
| 8.2.0 | 2026-07-30 | 3 |
| 8.2.1 | 2026-08-06 | 0 |
| 8.2.2 | 2026-08-20 | 0 |
| 8.3.0 | 2026-09-10 | 5 |
| 8.3.1 | 2026-09-24 | 0 |
| 8.3.2 | 2026-10-01 | 0 |
| 8.3.3 | 2026-10-06 | 0 |
| 8.2.4, 8.1.6, 7.3.7, 6.4.4 | 2026-10-06 | 0 (backports of 8.3.3's fixes; 6.4.4 also carries #20410, a fix; nothing the 8.3 line lacks) |
| 8.3.4 | 2026-10-08 | 0 |

8.1.1 and 8.1.2 were published on 2026-06-30, not after it, and are out. 8.2.0-beta.0, 8.3.0-beta.0 and 8.3.0-beta.1 are prereleases; every item in their changelogs was checked to appear in the 8.2.0 or 8.3.0 stable section. No major release in the window (8.0 is before it), so no migration guide applies. Totals: 8 entries; default-behavior 6, deprecation 2, breaking 0.

## Sources consulted

- GitHub releases, `gh api repos/vitejs/vite/releases --paginate`: https://github.com/vitejs/vite/releases/tag/v8.1.3 through https://github.com/vitejs/vite/releases/tag/v8.3.4, plus v8.2.4, v8.1.6, v7.3.7, v6.4.4 (those four bodies only point to the changelog at their tag). Same content as the changelog; 0 entries of their own. `create-vite@*` and `plugin-legacy@*` releases are other packages and were not used.
- Changelog file: https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md (sections 8.1.3 to 8.3.4) and the changelog at each backport and beta tag. All 8 entries come from "Features" sections; no section in the window is headed "Breaking Changes" and no bullet says "deprecate".
- Docs: commits since 2026-06-30 to `docs/changes/` (Vite's breaking-changes and future-deprecations pages) and `docs/guide/migration.md` are link and grammar fixes only; `docs/blog/` has no post for 8.2 or 8.3. 0 entries.
- Implementing PRs read for old/new behavior: #22674 (wasm), #22850 and #23378 (config loader warnings), #22280 (worker search params), #23183 (inline style minify), #22473 (worker chunk removal), #22888 and #22894 (ROLLDOWN_FILE_URL), and the left-out ones below (#22642, #23035, #23191, #23133, #23310, #23446, #23437). The direct `.wasm` import feature #21779 is in 8.1.0 (2026-06-23), before the window, so the 8.2.0 change to it counts.

## Judgment calls

### Included (and why)

- **`config-native-loader-incompat-warnings`** (8.2.0) and **`config-json-named-import-warning`** (8.3.0) typed `deprecation`: the notes call them warnings, not deprecations, but the warning text says the native loader "is planned to become the default in a future major version", i.e. the listed config patterns are on notice. Two entries because they shipped in different releases (8.3.0 adds a new item to the same warning). The five items in #22850 are one entry (same kind, same release).
- **#22674 split in two** (`wasm-exported-globals-unwrapped`, `wasm-js-string-builtins-enabled`): one bullet bundles two unrelated changes to `.wasm` imports. The second is the less certain one: it only matters for wasm modules that import `wasm:js-string` builtins or string constants.
- **Build-output changes presented as features**, included under "when unsure, include", with the walk free to skip them: `html-inline-style-minified` (#23183; inline `<style>` in `dist/index.html` is now minified and `</style>` escaped), `unreferenced-worker-chunk-removed` (#22473; a worker file is no longer emitted), `asset-urls-rolldown-file-url` (#22888 + #22894 merged: same kind, same release; the `__VITE_ASSET__` placeholder is internal, but plugins running after Vite's asset plugin see different code). The last is the most likely to be "internal only".
- **`worker-search-params-preserved`** (#22280): clear behavior change for the same input (params used to be stripped).

### Left out (and why)

- APIs added inside the window and changes to them: the top-level `input` option (#22642, 8.2.0) and `input` being added to `server.fs.allow` (#23035, 8.2.0); the config-incompatibility warning's column (#23064) refines a warning added in 8.2.0.
- Additive features: `server.watch` accepting Rolldown watch options (#23133), top-level `tsconfig` option (#23310), `closeServer`/`closePreviewServer` hooks (#23110), subpath imports in dynamic `import()` (#23185; did not resolve before, like v3's TS `#/` call), CPU profile naming (#23042), PostCSS config type export (#22792), aube/nub lockfile support (#22813, #22891), devtools dev-server integration (#23333), `@vitejs/devtools` peer range widened (8.2.2).
- New warning for hooks that never ran on plugins returned from `applyToEnvironment` (#23191): nothing that worked before behaves differently.
- Dev-server terminal output and experimental `bundledDev` internals: network URLs labeled with interface names (#22830, #22965), client-side HMR and reload-once in bundled dev (#22961, #23106), bundled-dev worker HMR (#23068).
- Performance: preload-dependency settling (#23446), proxy matcher precompile, CSS chunk Set lookup, etc.
- Everything under Bug Fixes, including the security-flavored `fs.serve` checks (#23655, #23656) and "only treat whole `node_modules` path segments as dependencies" (#23437), none marked breaking or changing a default; dependency bumps; docs; refactors (`HmrUrl` concept removed, unused `esbuildPlugin` deleted: internal).
- `legacy: prefer oxc as minifier` (8.1.4 changelog, #22468): it is `@vitejs/plugin-legacy`, a different package.
