# framer-motion (and motion): sources and judgment calls

Family `framer-motion` (repo `motiondivision/motion`, monorepo). `motion` is the same project published under a second name: `motion` re-exports `framer-motion` and both are released in lockstep with the same version numbers (npm `time` checked for both: identical version lists, publish times minutes apart). Entries are listed under `framer-motion`; each applies equally to `motion` (imports from `motion/react`). Pinned version **14.4.0** for both.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19 (npm `time`, UTC): **22 versions**: 12.43.0 (2026-07-28), 13.0.0 (2026-08-05), 13.1.0, 13.1.1, 13.2.0, 13.3.0, 13.4.0, 13.4.1, 13.4.2, 13.4.3, 13.4.4, 13.4.5, 13.4.6, 13.5.0, 13.5.1, 14.0.0 (2026-10-02), 14.1.0, 14.1.1, 14.2.0, 14.3.0, 14.3.1, 14.4.0 (2026-10-19). Prerelease 13.1.1-alpha.0 is not listed. 12.42.1 and 12.42.2 were published on 2026-06-30 (npm; the changelog dates 12.42.2 2026-07-01) and are outside the window. The changelog has a 13.4.7 section (2026-09-30) that was never published to npm; its changes are counted at 13.5.0, the first stable release that shipped them. New major lines: 13.0.0 and 14.0.0.

Dates in the changelog differ from npm by a day for a few versions (e.g. 14.3.1/14.4.0 changelog 2026-10-18, npm 2026-10-19); entries use npm dates.

## Sources consulted

| source | entries |
|---|---|
| https://registry.npmjs.org/framer-motion and /motion (`time`; `dependencies`, `peerDependencies`, `peerDependenciesMeta` of 12.42.2, 13.0.0, 13.5.1, 14.0.0, 14.4.0) | 0 (confirms the 13.0.0 peer removal) |
| GitHub releases (`gh api repos/motiondivision/motion/releases --paginate`) | 0: the repo publishes no GitHub releases in the window (none at all returned) |
| CHANGELOG.md, https://github.com/motiondivision/motion/blob/main/CHANGELOG.md (sections 12.43.0–14.4.0, plus unpublished 13.4.7) | 5 |
| React upgrade guide, https://motion.dev/docs/react-upgrade-guide (sections 13.0 and 14.0) | 1 (13.0 is-prop-valid; 14.0 says "no breaking changes", deprecates unnamed internal APIs) |
| JavaScript upgrade guide, https://motion.dev/docs/upgrade-guide (13.0: no JS changes; 14.0: as above) | 0 |
| https://motion.dev/changelog?type=major (13.0.0, 14.0.0 entries; no blog post linked) | 0 beyond the changelog |
| Installed packages 12.42.2, 12.43.0, 13.0.0, 13.1.0, 13.1.1, 13.2.0, 13.3.0, 13.4.0, 13.4.4, 13.4.6, 13.5.0, 13.5.1, 14.0.0, 14.4.0, each with the exact motion-dom/motion-utils versions it was published against (`npm install --ignore-scripts` under `bench/.work/research/framer-motion/`): runtime export list of `require('framer-motion')` diffed release by release; `@deprecated` tags across framer-motion, motion-dom and motion-utils `.d.ts` diffed; motion-dom 14.3.0 vs 14.3.1 tarballs | verification; 1 entry (14.3.1 MotionPath) rests on the `.d.ts` |

Total: **5 entries**: 2 `breaking`, 1 `deprecation`, 2 `default-behavior`.

## What the package diff shows

Runtime exports: nothing was removed from 12.42.2 to 14.4.0 except `observeTimeline` (absent in 13.5.0, back in 13.5.1, gone from 14.0.0). Exports added in the window: `MotionValueState`, `addEffect`, `createEffect`, `findEffect`, `removeEffect`, `animateEffectSubject` (13.2.0); `addSVGValue`, `animateElement`, `animateValues`, `readSVGValue`, `readStyleValue`, `handOffElementState`, `hasComplexValues`, `styleSubjectEffect`, `svgSubjectEffect` (13.3.0); `originProps` (13.5.1); drag/layout APIs (14.1.0–14.4.0). New `@deprecated` tags in the window: the compatibility shims in 13.x (removed again by 14.0.0) and `MotionPath.animateVisualElement` (14.3.1).

## Judgment calls, included

- `13.0.0/is-prop-valid-no-longer-auto-loaded`: from the changelog and the React upgrade guide; `@emotion/is-prop-valid` leaves `peerDependencies`/`peerDependenciesMeta` and the auto-require path is gone from the bundle; `MotionConfig isValidProp` already existed in 12.42.2. Breaking.
- `13.4.4/scroll-callbacks-drop-scrolltimeline` and `13.5.0/scroll-offset-animations-main-thread`: "Changed" bullets that switch how `scroll()`/`useScroll` are driven (native ScrollTimeline/ViewTimeline vs main-thread measurement). Unsure: the notes present them as changes, but the intended visible result is the same (likely S1 or S8 in the walk). Two entries: different items (JS progress callbacks vs offset-based animations). The unpublished 13.4.7 bullets ("more offsets hardware accelerated via ViewTimeline", "remove ScrollTimeline/ViewTimeline observer") are superseded within 13.5.0 and folded into the 13.5.0 entry.
- `14.0.0/observe-timeline-removed`: the 14.0.0 bullet removes "internal APIs restored in 13.5.1"; the export diff shows that is `observeTimeline` (exported since before the window). The changelog says undocumented APIs are internal and the upgrade guide says 14 has no breaking changes, so unsure; included because it is a removed public export in a major. Dated 14.0.0, not 13.5.0: the 13.5.0 removal was reverted in the next patch and only the 14.0.0 removal stands.
- `14.3.1/motion-path-animate-visual-element-deprecated`: not in the notes (the 14.3.1 bullet is "`arc`: Fix path animations with `animate`"); motion-dom 14.3.1's `.d.ts` makes `MotionPath.animateVisualElement` optional and `@deprecated` in favour of a new `animateValues` hook. `MotionPath` is exported (type) since before the window and re-exported by framer-motion. Unsure (only custom path implementers are affected); included.

## Judgment calls, left out

- 13.2.0 "`MotionValueState` no longer caches values in `latest` … `set()` drops its `useDefaultValueType` argument": `MotionValueState` was declared but not exported in 12.42.2; it became an export in 13.2.0 (in the window). Change to an in-window API.
- 13.5.1 "Changed: `<motion>` falls back to the attribute in readSVGValue" and "internal changes to `animateChanges`": `readSVGValue` was added in 13.3.0; size/internal work.
- 14.0.0 "stricter versioning" (exact pins of framer-motion/motion-dom/motion-utils): dependency pinning, not an API change; mentioned in the observeTimeline summary.
- Fixed-section bullets with visible effects, left out as fixes not marked breaking: 12.43.0 `AnimatePresence` exit/enter ordering and "throw error when passing a custom `motion` component an incorrect `ref` type"; 13.4.2 "unrecognised easing names no longer throw"; 13.5.1 `inherit={false}`, `svgEffect` no longer writing transforms as attributes; 14.3.1 `AnimatePresence` `onExitComplete` timing.
- Performance and size bullets (13.3.0, 13.4.4, 13.4.5, 13.5.0 "`<m>` 20% smaller", 14.1.1 `cubicBezier`), hardware acceleration additions (12.43.0 `backgroundColor`/SVG, 14.2.0 independent transforms): performance/features.
- Features: 13.1.0 Reorder, 13.2.0 effects/`motion/three`/`motion/vgpu`, 13.4.0 `AnimateView`, 13.5.0 negative `bounce`, 14.1.0 `animateLayout`, 14.3.0 `stagger` grid and `scaleZ`, 14.4.0 JS `drag`.
