# react: sources and judgment calls

Package `react`, treated as one project with `react-dom` (entries for react-dom changes use package `react`, the same version number and the same release notes). Pinned version **19.3.1**. The GitHub repository `facebook/react` now redirects to `react/react`; the release URLs below are the canonical ones the API returns.

## Version range

Stable `react` versions published after 2025-07-31 and on or before 2026-10-15, from `npm view react time --json` (UTC dates; `react-dom` was published within seconds of each):

| line | versions (npm publish date) |
|---|---|
| 19.3 | 19.3.0 (2026-09-09), 19.3.1 (2026-10-14) |
| 19.2 | 19.2.0 (2025-10-01), 19.2.1 (2025-12-03), 19.2.2 (2025-12-11), 19.2.3 (2025-12-11), 19.2.4 (2026-01-26), 19.2.5 (2026-04-08), 19.2.6 (2026-05-06), 19.2.7 (2026-06-01), 19.2.8 (2026-07-21), 19.2.9 (2026-10-14) |
| 19.1 backports | 19.1.2 – 19.1.10 |
| 19.0 backports | 19.0.1 – 19.0.9 |

The 19.0.x and 19.1.x releases in the window are backports of the same React Server Components security patches as the 19.2.x patches; none of them changed anything the newest line did not, so they contribute no entries.

## Sources consulted

| source | entries |
|---|---|
| https://github.com/react/react/releases/tag/v19.2.0 (GitHub release, incl. "Notable changes" and "All Changes") | 7 |
| https://react.dev/blog/2025/10/01/react-19-2 (React 19.2 release post; "Notable Changes" and "Changelog" sections) | same 7 (2 cite its anchors as source) |
| https://github.com/react/react/releases/tag/v19.3.0 (GitHub release) | 16 |
| https://react.dev/blog/2026/09/09/react-19-3 (React 19.3 release post; "Trusted Types support", "Changelog" sections) | same 16 (1 cites its anchor as source) |
| https://github.com/react/react/blob/main/CHANGELOG.md (sections 19.3.0, 19.2.0–19.2.7, 19.1.2–19.1.8, 19.0.1–19.0.7) | 0 new; identical to the release bodies |
| GitHub releases v19.2.1 … v19.2.9, v19.3.1, v19.1.2 … v19.1.10, v19.0.1 … v19.0.9 (React Server Components security patches) | 0 |
| GitHub releases eslint-plugin-react-hooks@7.1.0, @7.1.1 (listed only because they appear in the repo's release list in the window) | 0 (separate package) |

Total: 23 entries, all `default-behavior`; 0 `breaking`, 0 `deprecation`. No deprecation of a `react`/`react-dom` API appears in any of these notes.

## How the rules were applied

- "Notable changes" in the release notes and blog post count as default-behavior entries when they describe a behavior change (per the task brief). Items under "Notable changes" that are purely additive features (Node Web Streams for SSR, `browser()`, `<ViewTransition>`, Fragment refs) are left out as features.
- In "All Changes", bullets that begin with "Fix" or are listed by the blog under "Notable bug fixes" are bug fixes and are left out. Bullets that describe a public API behaving differently for the same input ("Stop warning…", "Don't invoke…", "Batch…", "Fire…", "Use…", "Update…") are included, with a note where the judgment was close.
- DEV-only warnings that are added or removed are included as default-behavior (an existing API now warns, or stops warning, for the same input). Changes only to the wording of a warning or error are left out.
- Changes listed under "React Server Components" are in the `react-server-dom-webpack`/`-turbopack`/`-parcel` packages, not `react` or `react-dom`, and are left out as separate packages. Likewise "React Reconciler" (`react-reconciler`) and `eslint-plugin-react-hooks`.
- Fixes to APIs added inside the window (`<Activity>`, `useEffectEvent`, `cacheSignal`, resume/prerender `postponed`, `<ViewTransition>`, Performance Tracks: all 19.2.0 or later) are left out by the "added inside the window" rule.

## Judgment calls, 19.2.0

Included:
- `ssr-batch-suspense-reveals`: "Notable changes"; the blog calls it a fix for a behavioral mismatch but presents it as a change in SSR reveal timing, so it counts.
- `useid-underscore-prefix`: listed under "Notable changes" and twice under "All Changes" (React DOM); counted once.
- `context-stringify-name`: changes the name of a context in stacks/DevTools/warnings; dev-facing but a changed output for the same input. Unsure.
- `dehydrated-boundary-resuspend-hide`: "Hide/unhide the content of dehydrated suspense boundaries if they resuspend"; presented as a change, not a fix. Unsure.
- `ssr-block-on-suspensey-fonts`: SSR reveal now waits on fonts; a timing/behavior change.
- `aria-1-3-no-warning`, `warn-container-with-text`: DEV warning removed / added (see rule above). Unsure, dev-only.

Left out:
- New features: `<Activity>`, `useEffectEvent`, `cacheSignal`, Performance tracks, `resume*` / `resumeAndPrerender*` APIs, `prerender` returning `postponed` (additive field), Node Web Streams (`renderToReadableStream`, `prerender`) available in Node, `progressiveChunkSize` option enabled, `nonce` allowed on hoistable styles.
- Bug fixes: `useDeferredValue` loops/initial value, client-action form crash, hot-reload stack overflow, `React.use` inside `React.lazy`, nested Suspense in SSR fallback, hanging after abort.
- Logging/wording: owner and component stack improvements, `%o` cause placeholder in instrumentation errors, "HTML" → "text" in hydration-mismatch messages.
- Separate packages: all "React Server Components" bullets (preload hints, production-element error log, temporary references, `filterStackFrame` line/column, Turbopack async modules, `.mjs` in Webpack, key warning, console order); `react-reconciler` `createContainer`/`createHydrationContainer` parameter reorder; `eslint-plugin-react-hooks` 6.1.0 breaking changes (Node 18, flat config default, new violations).

## Judgment calls, 19.2.1 – 19.2.9 (and 19.0.x / 19.1.x backports)

All are React Server Components security hardening (loop/cycle protections, DoS mitigations, type hardening, transport protocol) in the `react-server-dom-*` packages; none describes a change to the behavior of correct code or a default in `react`/`react-dom`. 0 entries. Noted:
- 19.2.2 "Move `react-server-dom-webpack/*.unbundled` to private `react-server-dom-unbundled`" removes a public entry point, but of a separate package; left out.
- 19.2.7 fixes a 19.2.6 regression (FormData entries in Server Actions); fix.

## Judgment calls, 19.3.0

Included:
- `trusted-types-no-coercion`, `transitions-render-independently`, `conditional-use-warning`: the three "Notable changes".
- `strict-mode-double-effects-hydration`: in the blog's "Other notable changes"; a behavior change for StrictMode roots that hydrate.
- `strict-mode-no-effects-on-moved-children`: "Don't invoke effects on moved children in StrictMode"; dev-only. Unsure.
- `no-warning-data-block-scripts`: DEV warning removed. Unsure, dev-only.
- `lazy-resolves-default-export`: "Resolve the `.default` export of a `React.lazy` as the canonical value"; presented as a change; its visible effect (component identity) is not spelled out. Unsure.
- `select-parser-rules`, `css-shorthand-list-updated`: changes to which DEV DOM-nesting / style warnings fire. Unsure, dev-only.
- `number-input-defaultvalue`: the release notes say "Update defaultValue for type="number" inputs to match other input types" (a change); the blog lists the same PR under "Notable bug fixes". Included because one source presents it as a change. Unsure.
- `iframe-credentialless-boolean`: a new recognized boolean attribute changes what `credentialless={true}` renders (bare attribute instead of `"true"`). Unsure; could be read as a feature.
- `form-auto-reset-fires-onreset`, `formdata-uses-submitter`, `batch-resize-updates`: blog "Other notable changes"; existing behavior differs for the same input.
- `ssr-no-onallready-after-shell-error`, `ssr-incomplete-tree-is-error`: `react-dom/server` callback/recovery semantics presented as changes ("Stop firing…", "Treat … as an error"). Unsure; could be read as fixes.

Left out:
- Features: `<ViewTransition>` and `addTransitionType`, Fragment refs, `browser()`, `onBrowserBailout`, `source` on the synthetic `toggle` event, `fetchPriority` for module resources, `maskType` SVG prop, `onFullscreenChange`/`onFullscreenError`, `submitter` on `submit` events (additive property), Bun entrypoint gaining Node APIs, `<Context>` renderable directly from Server Components (relaxed constraint; also RSC).
- Bug fixes (release notes "Fix …" or blog "Notable bug fixes"): Fast Refresh fixes, Performance Track fixes, Activity fixes, `useDeferredValue` stuck, context propagation, dehydrated boundary hang, `useEffectEvent` latest values, `innerHTML` not reset when unchanged, `preloadModule` nonce forwarding, stylesheet preload tracking, reentrant `finishedTask`, form status reset, Deno hang, stack-overflow recovery, nonce hydration false positive, shell-error callback guards, `nextSegmentId`, `referrerPolicy` preload, non-script `modulepreload`, `useId` on replay, replay during hydration.
- Wording/logging only: clearer error for a badly instrumented rejected Promise, `useActionState` "action state" message, `credentialless` casing suggestion, owner stacks limited to 10 frames, `<Offscreen>` removed from error messages, DevTools cascading-update annotations.
- Internal: `getNearestMountedFiber`, lazy-initializer instrumentation, Host Singleton handling, the Fizz abort-handling series (#36574–#36586), reentrancy protections, suspensey-CSS outlining, Suspense-boundary field unification, render-lifetime controller, caller-signal retention, computed-property transpilation.
- Separate packages: every "React Server Components" bullet (Flight client/server: `unstable_allowPartialStream`, `Error.cause`/`AggregateError.errors` transport, `pending_weak`, debug-info changes, `decodeReplyFromBusboy` fix, etc.).

## Judgment calls, 19.3.1

"Improve transport protocol" in React Server Components only; separate packages. 0 entries.

## Other notes

- The blog's "Other notable changes" list mixes features and behavior changes; only items that alter existing behavior for the same input were taken from it.
- `react-dom` 19.2.0 "Add Node Web Streams to server-side-rendering APIs for Node.js" sits under "Notable changes" but only adds exports to the Node entry; left out as a feature. Noted here in case the walk wants to reconsider.
