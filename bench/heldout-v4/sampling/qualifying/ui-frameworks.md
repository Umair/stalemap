# Qualifying: UI frameworks

Candidates in rank order (from `frame.json`), window: stable releases published after 2026-06-30 and on or before 2026-10-19, up to the pinned version. Stop rule: 4 qualifying packages or the end of the list. The list ended with **2** qualifying packages.

| # | package | pinned | verdict | reason |
|---|---|---|---|---|
| 1 | react (family: react, react-dom) | 19.3.1 | qualifies | 19.3.0 (2026-09-09), "Notable changes": React DOM passes Trusted Types objects to DOM sinks instead of coercing them to strings (plus 15 more default/behavior entries in the same release). 19.2.8, 19.2.9, 19.3.1 and the 19.0.x/19.1.x backports touch only React Server Components packages. |
| 2 | vue | 3.5.44 | doesn't | Releases 3.5.40–3.5.44: every changelog entry is under "Bug Fixes"; nothing marked breaking, no deprecation, no default change. GitHub release bodies only point to CHANGELOG.md. (3.6.0 is still in release candidates.) |
| 3 | @angular/core | 22.2.3 | doesn't | Releases 22.0.5–22.2.3 (and the 20.3.x / 21.2.x backports): every `core` row is typed `fix`, `feat` or `perf`; no breaking-change section in any release. The only "Deprecations" section in the window (22.1.0: `HttpClient.jsonp`, `HttpClientJsonpModule` deprecated) is in `@angular/common/http`, and 22.1.0's CSS-variable namespacing is in `@angular/compiler`: separate npm packages, not merged into a family by `frame.ts` (see judgment call below). |
| 4 | svelte | 5.57.2 | doesn't | Releases 5.56.5–5.57.2: only `fix:`/`perf:`/`chore:` patch changes and additive `feat:` minor changes (5.57.0: new exports, `createContext().has`, `defaultValue` on `<select>`, `SvelteMap.getOrInsert*`). |
| 5 | solid-js | 1.9.17 | doesn't | Releases 1.9.14–1.9.17: only patch fixes and dependency bumps (DOM Expressions, seroval), none marked breaking. (2.0 is still in release candidates.) |
| 6 | preact | 11.0.1 | qualifies | 11.0.0 (2026-09-30) opens a new major line. |

Qualifying order: **react, preact** (only two; the list ended). Population built for both (`population/react.*`, `population/preact.*`).

## Judgment calls

- **@angular/core scoped to the one npm package.** Angular publishes `@angular/core`, `@angular/common`, `@angular/compiler`, `@angular/router`, `@angular/forms` and others in lockstep from one changelog. `frame.ts` merges only packages that are themselves candidates (`react` + `react-dom`), and `@angular/core` is the only Angular candidate, so the changelog was read for the `core` scope only, the way v3's React population left out `react-server-dom-*` and `react-reconciler`. If the frame should treat `@angular/core` as the whole Angular project, Angular qualifies at 22.1.0 through the `@angular/common/http` JSONP deprecation (https://github.com/angular/angular/blob/main/CHANGELOG.md#2210-2026-07-29) and would be the third population package.
- `core` rows typed `fix` that change observable behavior were treated as bug fixes, per the rules: 22.1.1 "warn when style property bindings receive invalid values"; 22.2.1 "block dangerous data: and vbscript: URLs in URL sanitizer" and "extend data: URL allowlist for non-executable MIME types".
- vue: entries such as "runtime-dom: treat playsinline as a boolean attribute" (3.5.44) and "custom-element: warn when props override native properties" (3.5.41) change output for the same input but sit under "Bug Fixes", so they don't count.
- svelte / solid-js: everything is labelled `fix:` or listed as a patch fix; solid-js 1.9.17 "SSR validates dynamic attribute and tag names" is a dependency bump for security, not marked breaking.
