# UI components and styling: qualifying

Window: stable releases published after 2026-06-30 and on or before 2026-10-19, up to the pinned version. Candidates walked in rank order (from `frame.json`) until 4 qualified. `motion` is ranked under the `framer-motion` family and researched there.

| # | package | pinned | verdict | reason |
|---|---|---|---|---|
| 1 | lucide-react | 1.59.0 | qualifies | 1.27.0 (2026-07-25): `podcast` replaced by `mic-signal`, `Podcast` kept only as a deprecated alias (also 1.42.0: `absoluteStrokeWidth` and `IconNode` marked `@deprecated`) |
| 2 | clsx | 2.1.1 | doesn't | no release in the window |
| 3 | tailwind-merge | 3.7.0 | doesn't | release 3.7.0 (2026-09-12), the only one in the window: only features (`themeKey` on `fromTheme` getters, tag naming), bug fixes, docs and chores (GitHub release and `packages/tailwind-merge/docs/changelog/v3-changelog.md`) |
| 4 | class-variance-authority | 0.7.1 | doesn't | no release in the window |
| 5 | framer-motion (with `motion`) | 14.4.0 | qualifies | new major lines 13.0.0 (2026-08-05) and 14.0.0 (2026-10-02) |
| 6 | react-hook-form | 7.90.0 | qualifies | 7.84.0 (2026-08-01): `<FormStateSubscribe>` renamed `<FormState>`, the old name kept as a `@deprecated` alias (checked in the 7.84.0 `.d.ts`) |
| 7 | recharts | 3.10.1 | qualifies (4th) | 3.10.0 (2026-07-20): Legend `align`/`verticalAlign` marked `@deprecated` in favour of the new `position` prop, and Legend `layout` default changes from `"horizontal"` to `"auto"` (release notes plus the 3.10.0 `.d.ts`) |
| 8 | @radix-ui/react-dialog | 1.3.1 | not examined | category already has 4 |
| 9 | @emotion/react | 11.14.0 | not examined | (0 releases in the window per frame.json) |
| 10 | @mui/material | 9.5.0 | not examined | category already has 4 |
| 11 | styled-components | 6.6.0 | not examined | category already has 4 |
| 12 | chart.js | 4.5.1 | not examined | (0 releases in the window per frame.json) |
| 13 | three | 0.186.1 | not examined | category already has 4 |

Top 3 (population built): lucide-react, framer-motion, react-hook-form. Fourth: recharts.
