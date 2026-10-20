# react: sources and judgment calls

Package `react`, treated as one family with `react-dom` (entries for react-dom changes use package `react`, the same version number and the same release notes), as in v3. Pinned version **19.3.1**. The GitHub repository `facebook/react` redirects to `react/react`; release URLs are the canonical ones the API returns.

## Version range

Stable `react` / `react-dom` versions published after 2026-06-30 and on or before 2026-10-19 (from `frame.json` / npm `time`):

| line | versions (npm publish date) |
|---|---|
| 19.3 | 19.3.0 (2026-09-09), 19.3.1 (2026-10-14) |
| 19.2 | 19.2.8 (2026-07-21), 19.2.9 (2026-10-14) |
| 19.1 backports | 19.1.9 (2026-07-21), 19.1.10 (2026-10-14) |
| 19.0 backports | 19.0.8 (2026-07-21), 19.0.9 (2026-10-14) |

## Sources consulted

| source | entries |
|---|---|
| https://github.com/react/react/releases/tag/v19.3.0 (GitHub release: "Notable changes", "All Changes") | 16 |
| https://react.dev/blog/2026/09/09/react-19-3 (release post: "Trusted Types support", "Changelog" → "Other notable changes" / "Notable bug fixes") | same 16 (1 cites its anchor) |
| https://github.com/react/react/blob/main/CHANGELOG.md (section 19.3.0; it has no sections for 19.2.8+ / 19.3.1) | 0 new; identical to the release body |
| https://github.com/react/react/releases/tag/v19.2.8 ("React Server Components: Performance improvements when decoding") | 0 |
| https://github.com/react/react/releases/tag/v19.2.9, https://github.com/react/react/releases/tag/v19.3.1 ("React Server Components: Improve transport protocol") | 0 |
| GitHub releases v19.1.9, v19.1.10, v19.0.8, v19.0.9 (same RSC patches backported) | 0 |

Total: 16 entries, all `default-behavior`; 0 `breaking`, 0 `deprecation`. No major release in the window, so no migration guide applies.

## Reuse of v3

v3 (`bench/heldout-v3/sampling/population/react.jsonl`) covered 2025-08-01 – 2026-10-15. Its 7 entries for 19.2.0 (2025-10-01) are before the v4 window and are dropped. Its 16 entries for 19.3.0 are the same changes, first shipped stable in 19.3.0 (in the v4 window), and are kept with v3's `id`, summary and source unchanged. I re-read the 19.3.0 release body and blog post myself and reached the same include/exclude set; the releases after 2026-10-15 in the window are none (19.3.1 and 19.2.9 are 2026-10-14 and were re-checked).

## How the rules were applied (same as v3)

- "Notable changes" that describe a behavior change count; additive features (`<ViewTransition>`, `addTransitionType`, Fragment refs, `browser()`, `onBrowserBailout`, `fetchPriority` for modules, `maskType`, fullscreen events, `submitter` on submit events, import-map `nonce`, Bun entry APIs, `<Context>` from Server Components) are left out.
- Bullets beginning "Fix …", the "Fast Refresh Fixes" / "Performance Track Fixes" / "Activity Fixes" groups, and items in the blog's "Notable bug fixes" are left out as fixes, except `number-input-defaultvalue` (see below).
- DEV-only warnings added or removed count as default-behavior; wording-only changes don't.
- "React Server Components" bullets are in `react-server-dom-*` packages, not `react`/`react-dom`: left out.

## Judgment calls (19.3.0)

Included, with the same doubts v3 recorded:
- `trusted-types-no-coercion`, `transitions-render-independently`, `conditional-use-warning`: the three "Notable changes".
- `strict-mode-double-effects-hydration` (blog "Other notable changes"), `strict-mode-no-effects-on-moved-children` (dev-only; unsure).
- `no-warning-data-block-scripts`, `select-parser-rules`, `css-shorthand-list-updated`: DEV warnings changed (unsure, dev-only).
- `lazy-resolves-default-export`: presented as a change; visible effect not spelled out (unsure).
- `number-input-defaultvalue`: release notes phrase it as an update, the blog lists it under "Notable bug fixes" (unsure).
- `iframe-credentialless-boolean`: new recognized boolean attribute changes what `credentialless={true}` renders (unsure; could be read as a feature).
- `form-auto-reset-fires-onreset`, `formdata-uses-submitter`, `batch-resize-updates`: blog "Other notable changes".
- `ssr-no-onallready-after-shell-error`, `ssr-incomplete-tree-is-error`: `react-dom/server` callback/recovery semantics phrased as changes (unsure; could be fixes).

Left out (noted for v4 specifically):
- Fixes to `<Activity>`, `useEffectEvent` and Performance Tracks. Under v3's window these APIs were "added inside the window" (19.2.0); under v4's window they predate it, so that reason no longer applies, but every such bullet is under a "Fixes" heading or in the blog's "Notable bug fixes", so they stay out as bug fixes. Closest calls: "Hide portal contents when an Activity is hidden" (#35091) and "Prevent errors thrown inside a hidden Activity from escaping to the visible UI" (#35074).
- "Double invoke effects in StrictMode after Fast Refresh" (#35962): listed under "Fast Refresh Fixes"; dev tooling.
- "Limit owner stacks to 10 frames", `useActionState` message wording, `<Offscreen>` removed from messages: logging/wording.

## 19.2.8, 19.2.9, 19.3.1 and the 19.0.x / 19.1.x backports

React Server Components only (decoding performance, transport protocol hardening) in `react-server-dom-*`: 0 entries.
