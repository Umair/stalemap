# lucide-react: sources and judgment calls

Package `lucide-react` (repo `lucide-icons/lucide`, monorepo; only the `lucide-react` package is in scope). Pinned version **1.57.0**.

## Version range

Stable `lucide-react` versions published after 2025-07-31 and on or before 2026-10-15, from `npm view lucide-react time --json` (UTC): **101 versions**, 0.536.0 (2025-08-01) through 0.577.0 (2026-03-04), then 1.0.0 (2026-03-23) through 1.57.0 (2026-10-14). Every 0.x minor is a semver-major line, so each 0.x release qualifies as a major. Prereleases in the window (0.554.0-rc.0, 1.0.0-rc.0, 1.0.0-rc.1) are not listed; their changes are counted at the stable release that shipped them. 0.535.0 (2025-07-31) and 1.58.0 (2026-10-16) fall outside the window.

Dates are the npm publish dates. They differ from the GitHub release dates for two versions (0.576.0: GitHub 2026-02-27, npm 2026-03-02; 1.19.0: GitHub 2026-06-13, npm 2026-06-16); neither carries an entry.

1.0.0 and 1.0.1 were both published on 2026-03-23. The 1.0.0 release page says it "was published unintentionally"; the published 1.0.0 tarball still contains the brand icons and the UMD build, and only 1.0.1 removes them, so the v1 changes are dated 1.0.1.

## Sources consulted

| source | entries |
|---|---|
| https://registry.npmjs.org/lucide-react (`time` field, for versions and dates) | 0 |
| GitHub release notes for all 101 window versions, https://github.com/lucide-icons/lucide/releases/tag/`<version>` (fetched with `gh api repos/lucide-icons/lucide/releases --paginate`; tags have no `v` prefix) | 11: 0.538.0 (1), 0.541.0 (1), 0.554.0 (1), 0.575.0 (1), 1.8.0 (1), 1.27.0 (1), 1.30.0 (1), 1.41.0 (1), 1.42.0 (3), 1.44.0 (1) |
| https://lucide.dev/guide/version-1 (repo `docs/guide/version-1.md`), the 1.0 announcement and upgrade overview, also the body of the 1.0.1 release | 1 (UMD build removed) |
| https://lucide.dev/guide/react/migration (repo `docs/guide/react/migration.md`), the React migration guide from v0 | 1 (brand icons removed) |
| https://lucide.dev/guide/react/advanced/aliased-names (how aliases are presented) | 0 |
| https://lucide.dev/guide/react/advanced/typescript, .../advanced/dynamic-icon-component, .../advanced/combining-icons, .../advanced/with-lucide-lab, .../basics/stroke-width (checked for mentions of `IconNode`, `__iconNode`, `absoluteStrokeWidth`, `nonScalingStroke`) | 0 |
| `packages/lucide-react/README.md` at tags 0.535.0 and 1.57.0 (diffed: only badges, links and sponsors changed) | 0 |
| `packages/lucide-react/` has no CHANGELOG file (directory listing checked at `main`) | – |
| PR #4409 "extract icon build logic into `@lucide/shared`" (1.42.0): https://github.com/lucide-icons/lucide/pull/4409 | 1 (`__iconData`), and the wording of the two 1.42.0 deprecations |
| PRs behind the other bullets, read for the exact items: #2862 (rail-symbol), #3572 (chrome), #3767 (fingerprint), #3945 (flip), #3943 (text-select), #4285 (.mjs), #4583 (podcast), #4606 (emoji), #3141 (trash), #4799 (swiss franc), #4833 (flip-2), #4761 (`__iconNode` in other packages), #4531 (circle-euro), #4840 (nut), #4513 (toBeRemovedInVersion), #4892 (@types/react), #4210 (dynamic imports fix), #3730 ("Fix default prop") | 0 beyond the above |
| Icon metadata `icons/<name>.json` at tag 1.57.0 for every renamed, replaced or deprecated icon (gives the alias lists and `deprecated` flags) | used for the alias names in summaries |
| Published tarballs lucide-react@0.535.0, 0.577.0, 1.0.0, 1.0.1, 1.8.0, 1.9.0, 1.27.0, 1.30.0, 1.41.0, 1.42.0, 1.48.0, 1.50.0, 1.57.0 (`npm pack`, unpacked read-only): `dist/lucide-react.d.ts` export lists diffed between versions, `dist/esm/icons/*` module exports, `dynamicIconImports`, `package.json`, presence of `dist/umd` | verification only; one entry (`__iconData`) rests on it together with PR #4409 |
| Repo source at tags 0.535.0 and 1.57.0: `packages/lucide-react/src/{Icon,createLucideIcon,defaultAttributes,types,context,DynamicIcon,lucide-react}.ts`, `packages/lucide-react/package.json`, `packages/shared/src/build/{defaultReactAttributes,buildLucideIconNode,buildLucideIconForReact}.ts`; commit history of `packages/lucide-react/src/types.ts` and `package.json` | verification only (defaults, peer deps, dating) |

Total: **16 entries**: 5 `breaking`, 11 `deprecation`, 0 `default-behavior`.

## How the release notes read

Almost every release lists only `feat(icons): added …` (new icons: features, left out) and `fix(icons): changed/arcified/optimised …` (drawing changes: left out unless the notes call them breaking, which only 0.554.0 does). Entries come from the bullets that rename, remove, replace or deprecate an icon, from the 1.0 guides, and from the package-level bullets that touch `lucide-react`.

What the published package shows about renames: comparing the exported names in `dist/lucide-react.d.ts`, **no export was removed between 0.535.0 and 1.0.0, 19 brand names were removed at 1.0.1, and no export was removed between 1.0.1 and 1.57.0**. So every rename, replacement or removal in the notes after 0.535.0, other than the brand icons, kept the old name as an alias export (the icon's `aliases` metadata lists the old name with `deprecated: true`). lucide-react's `.d.ts` does not put `@deprecated` on alias exports (only on the three Swiss franc icons, `IconNode` and `absoluteStrokeWidth`); the walk may find alias renames S7.

## Classification rule for renames

Applied the same way to every rename: when the old name stays exported as an alias of the new icon, the entry is a `deprecation` (the old name still works, the icon metadata flags the alias deprecated, and PR #4799 states the project's rule that "icons that had been renamed will result in deprecated aliases"). When the notes themselves mark the rename breaking (only 0.554.0 fingerprint), the entry is `breaking`. When an export disappears from the package, the entry is `breaking`.

## Judgment calls, included

- `0.538.0/rail-symbol-deprecated`: the bullet is `fix(icons): deprecate rail-symbol`; the 0.577.0 types carry `@deprecated` on `RailSymbol` where 0.535.0's do not. Deprecation.
- `0.541.0/chrome-renamed-chromium`: rename with alias; both names were already `@deprecated` as brand icons. Deprecation (rename); the removal is the 1.0.1 entry.
- `0.554.0/fingerprint-renamed-fingerprint-pattern`: the release has a "Breaking change" section with an import diff for lucide-react. In the package, `Fingerprint` is still exported (as an alias of `FingerprintPattern`) and `dynamicIconImports` still has a `fingerprint` key, but `dist/esm/icons/fingerprint.js` is no longer generated (PR #3767 skips the alias file so ad blockers stop blocking `fingerprint.js`). Breaking because the notes say so; the summary says what actually changed.
- `0.575.0/flip-renamed-square-centerline-dashed`, `1.8.0/text-select-renamed-square-dashed-text`, `1.30.0/emoji-icons-renamed`, `1.44.0/flip-2-renamed-triangles-centerline-dashed`: renames with aliases. One entry per release listing old→new names. The emoji entry's old names come from the alias metadata (`angry`, `annoyed`, `laugh`, `meh`, `frown`, `smile`); the PR lists only the new names. Deprecation each.
- `1.0.1/brand-icons-removed`: from the React migration guide (14 icons) plus the alias names the tarball diff shows removed with them (`Chrome`, `Trello`, `Twitch`, `Twitter`, `Youtube`). One entry for the release, listing all 19 names. Breaking.
- `1.0.1/umd-build-removed`: from the version-1 guide. Environment-only in the protocol's sense (S4), listed because the rules say a removed build format counts. Breaking.
- `1.9.0/esm-bundle-mjs-extension`: `feat(packages): use .mjs for ESM bundles`. Not marked breaking, but it renames every published ESM file (`module` field and `dist/esm/**`), which the rules count as a renamed file convention. Unsure (likely S4 or S6); included. Breaking.
- `1.27.0/podcast-replaced-by-mic-signal`: the notes say `podcast` is replaced by new `mic-*` icons; in the package `Podcast` becomes an alias of `MicSignal` (metadata `mic-signal.json` lists alias `podcast`, deprecated) and so renders different artwork. Treated as a rename with alias: deprecation.
- `1.41.0/trash-removed-in-favour-of-trash-2`: the notes say `trash` is removed in favour of `trash-2`. In the package nothing disappears: `trash.json` now carries the former trash-2 design with alias `trash-2` (deprecated), and `Trash2` is exported as an alias of `Trash`. Treated as a rename with alias (deprecation), with the artwork change stated in the summary. Unsure between deprecation and default-behavior (the `Trash` component draws differently); included once.
- `1.42.0/swiss-franc-icons-deprecated`: `fix(icons): deprecated swiss franc icons` (#4799); the 1.42.0 types add `@deprecated` to `SwissFranc`, `BadgeSwissFranc`, `ReceiptSwissFranc`. One entry for the release. Deprecation.
- `1.42.0/absolute-stroke-width-deprecated` and `1.42.0/icon-node-type-deprecated`: from PR #4409 (listed in the 1.42.0 notes as `feat(packages): extract icon build logic into @lucide/shared`): "Deprecated `absoluteStrokeWidth` (in favour of `nonScalingStroke`)"; the shipped types add `@deprecated` to both `absoluteStrokeWidth` (on `LucideProps` and `LucideProvider`'s config) and `IconNode`. The `packages/lucide-react/src/types.ts` history has exactly one commit in the window (#4409, 2026-09-04, after 1.41.0 was published), and the 1.41.0 tarball has neither tag while 1.42.0 has both. Two entries: different items. Deprecation each.
- `1.42.0/icon-module-exports-icondata`: the same PR changed every per-icon module from `export { __iconNode, X as default }` (1.41.0) to `export { __iconData, X as default }` (1.42.0 onward); the `dynamic.d.ts` still declares `__iconNode` with `@deprecated Access __iconData instead`, but the runtime module no longer exports it, and `DynamicIconModule` is typed `{ default, __iconData? }` instead of `{ default, __iconNode }`. Not a bullet in the notes and `__iconNode` is underscore-prefixed and undocumented in the React guides, so unsure; included because it removes an export that `lucide-react/dynamic` itself consumed and that PR #4761 (1.48.0) describes as a public export of lucide-react. Breaking.

## Judgment calls, left out

- New icons (every `feat(icons): added …`): features.
- Drawing changes (`fix(icons): changed/arcified/optimised/rotated/flipped …`, "unify check, cross and plus sizes", "improve calendar icons centre of gravity", `nut`/`nut-off` "replaced with compliant designs" #4840 under the same names): not API changes, not marked breaking.
- 1.25.0 `circle-euro-sign` → `circle-euro` (#4531, no alias kept): the icon was added in 1.24.0, inside the window, so the rename is a change to an in-window API.
- 1.0.1 "aria-hidden is now set by default on icons" (and 0.563.0's package-wide bullet): the 0.563.0 notes say this "was already added to lucide-react before"; `src/Icon.ts` at 0.535.0 already adds `aria-hidden="true"` when no a11y prop is given. No change for this package.
- 1.0.1 context providers (`LucideProvider`, `useLucideContext`): new API; the default `size` 24, `strokeWidth` 2, `color` currentColor and the SVG default attributes are unchanged (checked `src/Icon.ts`, `defaultAttributes.ts` and `@lucide/shared`'s `defaultReactAttributes`).
- 1.0.1 `lucide-vue-next` → `@lucide/vue`, `@lucide/angular`, font code points, shadow DOM in `lucide`: other packages.
- 1.17.0 "Remove deprecated packages (lucide-vue-next|lucide-svelte|lucide-angular)": other packages.
- 1.42.0 (#4409) `createLucideIcon(iconData)` and `Icon icon={…}`: new overload/prop, the old `createLucideIcon(name, iconNode)` and `iconNode` forms still type-check and work. Also `lucide-{alias}` CSS classes added to rendered icons: additive; the PR calls the React side backwards compatible. Left out.
- 1.49.0 `@types/react` declared as an optional peer dependency (#4892): adds an optional peer, raises no minimum; the `react` peer range (`^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0`) is identical at 0.535.0 and 1.57.0.
- 1.7.0 "Fix dynamic imports" (#4210, broken `dynamicIconImports` paths after 1.0): bug fix of an in-window regression.
- 1.24.0 / 1.30.0 removal of `toBeRemovedInVersion` from icon metadata and scripts: repository metadata, not shipped API.
- 0.548.0 "Fix default prop" (#3730): fixes `createIcons` in the vanilla `lucide` package's UMD build.
- 0.541.0 custom root element, 0.547.0 `<template>` handling, 0.553.0 preact `className`, 0.562.0 react-native `icons` namespace removal, 1.1.0/1.22.0 Astro, 1.9.0 Angular size input, 1.19.0/1.22.0/1.24.0/1.51.0 react-native fixes, 1.50.0 `buildLucideSvg` escaping in `@lucide/shared` (used by the vanilla package), 1.50.0 Svelte context subpath, 1.51.0 Solid 2.0, 1.53.0 site rename of "absolute stroke width": other packages or the website.
- 1.9.0 "fix(build-font)", 1.42.0 tests, dependency bumps, CI, docs, metadata/tag changes, brand stop words: chores, docs, tests.
- The 1.0.0 release (2026-03-23, "published unintentionally"): its tarball matches 0.577.0 plus three new icons; nothing to list.
