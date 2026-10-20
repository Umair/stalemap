# preact: sources and judgment calls

Package `preact`, pinned **11.0.1**. No v3 population exists for preact, so all ids are new.

## Version range

Stable versions published after 2026-06-30 and on or before 2026-10-19 (npm `time`):

| line | versions (npm publish date) |
|---|---|
| 11.0 | 11.0.0 (2026-09-30, new major), 11.0.1 (2026-10-08) |
| 10.29 | 10.29.4 (2026-07-03), 10.29.5 (2026-07-07), 10.29.6 (2026-07-07), 10.29.7 (2026-07-08), 10.29.8 (2026-08-01) |

Prereleases shipped by 11.0.0 (counted only through 11.0.0, dated 2026-09-30): 11.0.0-beta.0 (2025-08-19), beta.1 (2026-02-15), beta.2 (2026-07-15), rc.0 (2026-08-10), rc.1 (2026-08-26), rc.2 (2026-09-08). None of their changes shipped in a stable 10.x release before the window, except the "forward-port" items noted below, which are left out.

## Sources consulted

| source | entries |
|---|---|
| https://github.com/preactjs/preact/releases/tag/11.0.0 (points to the blog, the upgrade guide and the prerelease notes; its own items are fixes/perf/maintenance) | 0 own |
| https://github.com/preactjs/preact/releases/tag/11.0.0-beta.0 ("Breaking Changes", "Features", "Types", "Refactors") | 7 cite it; 8 more of its items are covered by guide sections and cite the guide |
| https://github.com/preactjs/preact/releases/tag/11.0.0-beta.1 | 0 (fixes, additive types, forward-ports) |
| https://github.com/preactjs/preact/releases/tag/11.0.0-beta.2 | 0 own (streamed hydration folded into the Hydration 2.0 entry) |
| https://github.com/preactjs/preact/releases/tag/11.0.0-rc.0 | 2 cite it (+ useEffect cleanup timing, #5196, cites the guide) |
| https://github.com/preactjs/preact/releases/tag/11.0.0-rc.1 | 0 |
| https://github.com/preactjs/preact/releases/tag/11.0.0-rc.2 | 2 cite it |
| https://preactjs.com/guide/v11/upgrade-guide (source: preactjs/preact-www `content/en/guide/v11/upgrade-guide.md`) | 14 cite it as source (`render-replacenode-removed` appears only in the guide) |
| https://preactjs.com/blog/preact-11 (preact-www `content/en/blog/preact-11.md`) | 0 new (summary pointing to the guide) |
| https://github.com/preactjs/preact/releases/tag/11.0.1 | 0 |
| https://github.com/preactjs/preact/releases/tag/10.29.8 | 1 |
| GitHub releases 10.29.4, 10.29.5, 10.29.6, 10.29.7 | 0 |
| Changelog file | none exists in the repository (release notes live only on GitHub releases) |
| PR pages read to judge entries: #4549, #4607, #4652, #4657, #4658, #4663, #4665, #4666, #4670, #4720, #4772, #4784, #4843, #4876, #4877, #4882, #4884, #5097, #5161, #5171, #5173, #5175, #5196, #5210, #5231, #5239, #5278 | - |

Total: **26 entries**: 20 `breaking`, 0 `deprecation`, 6 `default-behavior` (1 at 10.29.8, 25 at 11.0.0).

## Judgment calls

Typing: everything in the v11 upgrade guide that changes existing behavior, and everything under beta.0's "Breaking Changes", is `breaking`. Other behavior changes presented as changes (not fixes) are `default-behavior`.

Included, worth a second look:
- `flushsync-batches-updates` (10.29.8, #5173; mirrored to v11 as #5175 in rc.0): listed under "Performance", but the PR describes a changed render count for the same input (two setters inside `flushSync` now render once). Dated at 10.29.8, the first stable release that shipped it.
- `supported-browsers-raised`, `typescript-min-5-1`, `esm-only-distribution`, `render-to-string-peer-6-7`: environment changes (likely S4 in the walk) but breaking by the rules.
- `esm-only-distribution` merges #4652 (`.module.js` → `.mjs`, `exports.browser` → `exports.module`, `.min` builds dropped) and the guide's "Preact is distributed as ESM" section (CJS/UMD removed, #5159 "modern build setup"): one change to the package format. `nested-package-json-exports-removed` (#4784) is kept separate because it changes subpath resolution rather than formats; could be merged.
- `aria-roles-restricted-by-element` merges #4607 (restrict roles) with #4882 (which reverted #4876's interface→type switch and introduced the `Accessible*` types). #4876 on its own is net no change and is left out.
- `pascalcase-event-names-lowercased` (#4720): under "Refactors" but the PR says it is breaking (`onMyClickEvent` listens for `myclickevent`). 11.0.0's fix #5278 restored as-written casing for camelCase names such as `onionChange` (that only undid a regression inside the v11 prereleases), so the remaining change versus 10.x is the PascalCase case. Summary phrased accordingly.
- `static-vnode-bail-removed` (#4670) and `unmounted-check-uses-parentnode` (#4666): listed under "Breaking Changes" but described as internal; the second has no clear effect on application code. Included because the notes mark them breaking.
- `hydration-2-comment-markers`: "What's new" in the guide; changes how suspended SSR boundaries hydrate (comment markers from preact-render-to-string) rather than only adding API. Unsure; typed `default-behavior`.
- `dom-moves-use-movebefore` (#5161, rc.0 "Correctness"): changes what happens to moved DOM nodes in supporting browsers.
- `suspense-resuspend-keeps-hook-state` (#5239, rc.2 "Notable").
- `compat-version-19` (#5171, rc.0 "Maintenance"): the `version` export of preact/compat changes from `'18.3.1'` to `'19.0.0'` (checked in the PR diff).
- `compat-non-dimensional-props` (#4772, "Refactors"): changes which numeric style props get `px`; now only relevant with compat. Unsure.

Left out:
- Additive features: `createPortal` in core (still exported from compat), compat `use()`, `useEffectEvent`, `getServerSnapshot`, `Children.map/forEach` context argument, `captureOwnerStack` / `setupComponentStack` / debug helpers, compat test-utils export, `compat/server.browser` entry, streamed hydration (as a separate feature), tree-shaken compat hooks, new JSX types (`selectedcontent`, scroll-snap events, lowercased attributes, Signalish `input`), Trusted Types widening of `dangerouslySetInnerHTML`.
- Changes to APIs added inside the window: rc.2 "Make the Children.map/forEach context argument optional" (argument added in 11.0.0-beta.0); #5097 removing the `type` attribute from `<select>` types (a mistake introduced by #4882, never in a stable release).
- Fixes (any section labelled Fixes/Correctness fixes): e.g. "Only treat components with error handlers as error boundaries" (rc.2), "Avoid mutating user-provided style objects when appending px" (rc.0), "Preserve falsy key and ref values in cloneElement" (beta.2), "Preserve the casing of camelCase custom event names" (11.0.0), all 11.0.1 fixes, "Fix outdated public RefCallback type" (#4801, under Types but titled a fix), "Types w/ module augmentation" (#4884, a fix).
- Performance / bundle size / internal: "Omit dev fields from production jsx vnodes" (rc.2; `__source`/`__self` absent in production vnodes, presented as perf), "Require prop type stack getter" (#5210), "Remove rerendercount" (#4877, internal option), "Prune portal logic" (#4667), "DOM event name casing" (#4843, no behavior change), "Make HTMLAttribute type declarations consistent" (#4876, reverted by #4882).
- Logging: 11.0.1 "Log the component stack of errors no boundary handles".
- Forward-ports from v10 in beta.1/beta.2 (and the 10.29.3 items mirrored in beta.2): first shipped in stable 10.x releases before the window.
- 10.29.4 "Revert 'Fix useId stability across async Suspense'" and 10.29.6 revert of #5055: undo fixes that shipped in 10.29.3 (2026-06-26, before the window); restoring the earlier behavior, not a change to note. 10.29.5: a fix. 10.29.7 "Make RTS optional peer dep": relaxes a peer requirement (no raised minimum).
- Maintenance: Node 22 / Vitest 5 upgrades (repo tooling, not the package's `engines`), pnpm workspace, publishing workflow.
