# Qualifying: build, lint and language

Candidates walked in rank order (from `frame.json`) until 4 qualified. Window: stable releases published after 2026-06-30 and on or before 2026-10-19, up to the pinned version. Researched 2026-10-20.

| # | package | pinned | verdict | reason |
|---|---|---|---|---|
| 1 | typescript | 7.0.2 | qualifies | 7.0.2 (2026-07-08) opens the new 7.x major line; qualifies without reading notes (the notes have plenty, e.g. 6.0 deprecations such as `baseUrl` and `target: es5` are now hard errors). |
| 2 | eslint | 10.13.0 | qualifies | 10.7.0 (2026-07-10), Features: "report invalid signed numeric radix values in `radix` rule" (#21030), an existing rule reporting new cases for the same input, presented as a feature, not a fix. Further rule-behavior features in 10.9.0 to 10.13.0. |
| 3 | vite | 8.3.4 | qualifies | 8.2.0 (2026-07-30), Features: "unwrap WebAssembly.Global" (#22674): direct `.wasm` imports (added 8.1.0, before the window) now expose exported globals as JS values instead of `WebAssembly.Global` objects. Also 8.2.0 config-loader warnings for patterns the planned native default won't support, and 8.3.0 changes (worker search params preserved). |
| 4 | tailwindcss | 4.3.3 | qualifies | 4.3.3 (2026-07-16): the default theme's `--font-sans` changed from `ui-sans-serif, system-ui, sans-serif, …` to an explicit platform stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, …`) (#20318). Listed under "Fixed", but a default value changed, which counts in any section. |

Stopped after 4. Not examined: postcss, prettier, typescript-eslint, @babel/core, tsx, webpack, esbuild, rollup, storybook, turbo (turbo has no types and would not qualify).

Frame: typescript, eslint, vite (population built). Fourth: tailwindcss (population not built).
