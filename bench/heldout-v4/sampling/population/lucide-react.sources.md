# lucide-react: sources and judgment calls

Package `lucide-react` (repo `lucide-icons/lucide`, monorepo; only the `lucide-react` package is in scope). Pinned version **1.59.0**.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19 (npm `time`, UTC): **37 versions**, 1.23.0 (2026-07-01) through 1.59.0 (2026-10-17). No prereleases in the window. 1.22.0 (2026-06-28) is before the window; 1.60.0 (2026-10-20) is after it. lucide-react has no new major line in the window.

v3 (`bench/heldout-v3/sampling/population/lucide-react.jsonl`) covered this package through 1.57.0. Its 8 entries dated on or after 2026-07-01 are reused with their ids (one summary widened, see below); its 8 entries dated before 2026-07-01 are dropped. Every in-window release was re-checked here, including 1.58.0 and 1.59.0.

## Sources consulted

| source | entries |
|---|---|
| https://registry.npmjs.org/lucide-react (`time`, versions and dates) | 0 |
| GitHub release notes for 1.23.0–1.59.0 (`gh api repos/lucide-icons/lucide/releases --paginate`; https://github.com/lucide-icons/lucide/releases/tag/<version>) | 11 (all entries are tied to a release's bullets) |
| PRs behind the rename/deprecation bullets: #4583 (podcast), #4439 (pending-cw, which also renamed history), #4606 (emoji), #3141 (trash), #4799 (swiss franc), #4409 (`@lucide/shared`, absoluteStrokeWidth/IconNode/`__iconData`), #4833 (flip-2), #3043 (album/book-marked), #4758 (building-complex-plus, which also renamed building-2), #4072 (music icons) | wording and item lists |
| Icon metadata `icons/<name>.json` at tag 1.59.0 for every new canonical name (alias lists with `deprecated: true`) | alias names in summaries |
| Published tarballs of every version 1.22.0–1.59.0 (`npm pack`, unpacked under `bench/.work/research/lucide-react/`): the final `export { … }` list of `dist/lucide-react.d.ts` diffed release by release (canonical names that became aliases, removed names, retargeted aliases), `@deprecated` tags, `package.json` (1.22.0 vs 1.59.0) | verification; found 3 renames the notes don't state as renames (history, building-2, smile-plus) |
| v3's `lucide-react.sources.md` (judgment calls for 1.23.0–1.57.0) | reused reasoning |
| `packages/lucide-react/` has no CHANGELOG file | – |
| No migration guide: no major release in the window | – |

Total: **11 entries**: 1 `breaking`, 10 `deprecation`, 0 `default-behavior`.

## What the package diff shows

Release-by-release diff of the exports from 1.22.0 to 1.59.0: **no exported name was removed** except `CircleEuroSign` (1.25.0), which was itself added in 1.24.0 (in the window, so left out, as in v3). Every other rename kept the old name as an alias export (icon metadata flags it `deprecated: true`, reason `alias.name`); lucide-react's `.d.ts` puts no `@deprecated` tag on alias exports. Canonical→alias changes found, by release: 1.27.0 History, Podcast; 1.30.0 Angry, Annoyed, Frown, Laugh, Meh, Smile, SmilePlus; 1.41.0 Trash2; 1.44.0 FlipHorizontal2, FlipVertical2; 1.45.0 Album, BookMarked, Building2; 1.58.0 Music, Music2, Music3, Music4. `@deprecated` tags: 0 in 1.22.0, 6 from 1.42.0 on (the three Swiss franc icons, `IconNode`, `absoluteStrokeWidth` twice). `package.json`: only the optional `@types/react` peer (1.49.0) and dev dependencies changed; the `react` peer range is unchanged.

## Judgment calls, included

- Classification rule (as v3): a rename where the old name stays exported as an alias is `deprecation`; one entry per release for same-kind renames, listing the icons.
- `1.27.0/history-renamed-rotate-ccw-clock` (new): not stated in the notes; PR #4439 ("added `pending-cw` icon") also renamed `history.json` to `rotate-ccw-clock.json` with alias `history` (deprecated). The artwork is unchanged (same preview in 1.26.0 `History` and 1.27.0 `RotateCcwClock`). Kept as a separate entry from v3's `podcast-replaced-by-mic-signal`: podcast's alias points to a different, new design (a replacement), history is a pure rename. A reviewer could merge them as one "same-kind" entry for 1.27.0; I kept v3's id intact instead.
- `1.30.0/emoji-icons-renamed` (v3 id): summary widened to include `smile-plus → face-slightly-smiling-plus`, which v3 missed (the package diff shows `SmilePlus` becoming an alias in 1.30.0).
- `1.45.0/bookmark-and-building-icons-renamed` (new): one entry for the release. `album → square-bookmark` and `book-marked → book-bookmark` come from #3043 ("changed `album`, `book-marked`, `folder-bookmark` icons"; both redrawn; `folder-bookmark` kept its name); `building-2 → building-complex` comes from #4758 ("added `building-complex-plus` icon"), which renamed it silently (same artwork). v3 (through 1.57.0) missed all three.
- `1.58.0/music-icons-renamed-notes` (new): #4072 "update music icons": `music → eighth-notes`, `music-2 → eighth-note`, `music-3 → half-note`, `music-4 → sixteenth-notes`; Music, Music2, Music4 redrawn, Music3 same artwork.
- Reused from v3 unchanged (same reasoning as v3's sources file): `1.27.0/podcast-replaced-by-mic-signal`, `1.41.0/trash-removed-in-favour-of-trash-2` (unsure between deprecation and default-behavior since `Trash` now draws the former trash-2), `1.42.0/swiss-franc-icons-deprecated`, `1.42.0/absolute-stroke-width-deprecated`, `1.42.0/icon-node-type-deprecated`, `1.42.0/icon-module-exports-icondata` (breaking; not a bullet in the notes, from PR #4409 and the tarballs; unsure), `1.44.0/flip-2-renamed-triangles-centerline-dashed`.

## Judgment calls, left out

- New icons, drawing changes (`fix(icons): changed …`, 1.59.0 `chess-queen`, 1.58.0 `barrel`, 1.47.0 `save-off`, 1.50.0 `nut`/`nut-off` redrawn under the same names, etc.): not API changes.
- 1.25.0 `circle-euro-sign → circle-euro` (no alias kept): the icon was added in 1.24.0, inside the window.
- 1.49.0 optional `@types/react` peer: adds an optional peer, raises no minimum.
- 1.42.0 new `createLucideIcon(iconData)` overload, `Icon icon={…}`, `nonScalingStroke`, `lucide-{alias}` CSS classes: additive.
- 1.48.0 `__iconNode` exported in other framework packages; 1.50.0 `buildLucideSvg` escaping (vanilla); 1.50.0/1.51.0 Svelte, Preact 11, Solid 2.0; react-native and Angular fixes; site/docs/CI/deps/tests (1.23.0, 1.29.0, 1.53.0–1.58.0): other packages or chores.
- 1.24.0/1.30.0 removal of `toBeRemovedInVersion` from metadata and scripts: repository metadata.
