# Held-out benchmark v2 protocol (pre-registered)

Written and frozen before any agent session ran on these tasks. The task files and template hash to `f67095b1300b9b4a` (`cd bench/heldout-v2 && find tasks templates -type f | sort | xargs shasum -a 256 | shasum -a 256`, first 16 hex digits). Per-task hashes are at the end. Any later change to tasks, grading or analysis goes under "Deviations", with a reason. Before freezing, an independent review checked the suite, and its fixes are included here: tighter stale patterns, a CSS-only prompt for next-smooth-scroll, alternative solutions, build records, and the "using both" comparison.

## Why a second suite

The first held-out run ([../heldout/](../heldout/)) found stalemap losing on Next 16 config keys and file conventions that still type-check. stalemap is being changed in response, so re-running those tasks is post hoc. This suite tests that fix on tasks its author never tuned on.

To keep it blind, the tasks were written by a separate session that did not run stalemap. It did not read stalemap's generated notes (`bench/results/*/stalemap-notes*.md`), its notes renderer (`src/render.ts`) or its guard (`src/guard.ts`), and it ran no agent sessions. That session did see the first suite's tasks and a one-line summary of where stalemap lost. It weighted this suite toward that kind of change on purpose: six of the ten tasks target changes a type checker can't catch.

## Question

On API-change tasks it wasn't tuned on, does stalemap help a coding agent write working code more often, or more cheaply, than Context7 or no help at all? Does using both beat either alone? Does stalemap help when the stale code still type-checks, so its compile-error guard can't catch the mistake?

## Setup

- **Model and agent:** `claude-sonnet-4-5` (training cutoff 2025-07-31), Claude Code headless (`claude -p`) as described in [../README.md](../README.md#isolation).
- **Template:** [templates/latest](templates/latest/) pins `ai@7.0.142`, `next@16.4.2`, `react@19.3.1`, `react-dom@19.3.1`, `zod@4.6.7`, `@prisma/client@7.10.1`, `prisma@7.10.1`, `vitest@5.0.5` and `typescript@6.0.3`, plus `tsx@4.20.6` and `@types/node`, `@types/react` and `@types/react-dom`. It installs with plain `npm install --ignore-scripts` (checked 2026-10-16 with npm 10.9.8). Vitest 4.1.x isn't used because npm 10.9.8 fails to resolve its optional peer dependencies. Unlike the first suite, `tsconfig.json` type-checks `app/` and uses `"jsx": "react-jsx"`, so the hidden tests can render components.
- **Tasks:** 10, in [tasks/](tasks/). Each has a short prompt that doesn't name the new API, hidden tests, a reference solution, and a stale variant: the code a model with pre-cutoff knowledge would plausibly write. Every change shipped in a release after the 2025-07-31 cutoff:

| task | library | what changed (release, date) | kind | scenario |
|---|---|---|---|---|
| ai-chat-history | ai | `result.response.messages` now holds only the final step's messages; all of a multi-step call's messages are in `result.responseMessages` (ai 7, first released 2026-06-25; 6.0.308 still returned every step's messages) | type-checks | new-code |
| ai-token-usage | ai | usage is `inputTokens`/`outputTokens` with cached input under `inputTokenDetails.cacheReadTokens`; `promptTokens`/`completionTokens` (4.x) and `cachedInputTokens` (5.x, deprecated in 6.x, first released 2025-12-22) are gone in 7 | compile-error | new-code |
| ai-test-model | ai | `ai/test` exports `MockLanguageModelV4` (and V3) with the V4 result shape; `MockLanguageModelV1`/`V2` are gone (6.x ships only V3, 7 adds V4) | compile-error | new-code |
| next-image-defaults | next | `images.qualities` defaults to `[75]` (any quality was allowed) and `images.minimumCacheTTL` to 14400 s (was 60 s) (16.0, 2025-10-22) | type-checks | upgrade |
| next-sitemaps | next | with `generateSitemaps`, the sitemap function's `id` is a promise (was a string) (16.0) | type-checks | new-code |
| next-smooth-scroll | next | smooth scrolling is only suspended during route changes when `<html data-scroll-behavior="smooth">` is set; before, it was always suspended (16.0). The attribute and its dev warning already shipped in 15.4.5 (2025-07-29) as an opt-in behind `__NEXT_OPTIMIZE_ROUTER_SCROLL`, so only the default changed after the cutoff | type-checks | new-code |
| prisma-upgrade | prisma | the datasource `url` is no longer allowed in `schema.prisma` (error P1012); it moves to `prisma.config.ts` (7.0, 2025-11-19) | type-checks | upgrade |
| ts-path-alias | typescript | `baseUrl` is deprecated and reports error TS5101; `paths` resolve from the tsconfig (6.0, 2026-03-23) | compile-error | new-code |
| vitest-projects | vitest | `vitest.workspace`/`defineWorkspace`, `environmentMatchGlobs` and the `workspace` option were removed, leaving `test.projects` (4.0, 2025-10-22). `test.projects` itself existed from 3.2.0 (2025-06-02), so only the removal is post-cutoff | compile-error | new-code |
| zod-derived-schema | zod | `.pick()`/`.omit()` throw on object schemas that have refinements (4.3, 2025-12-31); 4.0 to 4.2 silently dropped the refinement, and in zod 3 `.refine()` returned a `ZodEffects` with no `.pick()` | type-checks | new-code |

  `kind` is recorded in each task's `meta.json`. `type-checks`: the stale variant compiles and only the hidden tests catch it (or, for Prisma, a non-TypeScript file). `compile-error`: the stale variant fails `tsc --noEmit`. zod 4.0.0 itself shipped on 2025-07-09, before the cutoff, so this suite uses no zod 4.0 change. Each current behavior was confirmed in the installed packages. The earlier behavior was confirmed against `next@15.4.5` (2025-07-29, the last pre-cutoff release), `ai@6.0.308` and zod's release notes, and from the errors Prisma 7, TypeScript 6 and Vitest print for the old setting.
- **Checks before freezing** ([validate.ts](validate.ts)), all passing on 2026-10-16:
  - every reference solution passes `tsc --noEmit`, the hidden tests and the visible smoke tests, and isn't flagged as stale or deprecated;
  - the untouched starting files fail;
  - every stale variant fails and is flagged by its task's stale patterns. Each stale variant's `tsc` result matches its task's `kind`: the six `type-checks` ones pass `tsc` and fail the hidden tests, and the four `compile-error` ones fail `tsc`;
  - 13 other correct solutions in `tasks/*/alt/` pass and aren't flagged as stale: `steps.flatMap(s => s.response.messages)`; `MockLanguageModelV3`; destructured usage; wider `qualities` with a `URL` remote pattern; numeric sitemap ids with an arrow function; an inline `scrollBehavior` style; a stylesheet outside `app/`; `import "dotenv/config"` with `process.env.DATABASE_URL` and a commented-out `url` line; an `@/lib/format.js` import; `baseUrl` with `"ignoreDeprecations": "6.0"` (flagged as deprecated); projects with `extends: true`; `z.object(AccountSchema.shape).pick(...)`; and an unrefined base schema in `account.ts`.
- **Grading uses each tool's own logic** where it can: Next's `loadConfig` and image-request validation, Next's sitemap serializer called the way Next 16's route calls it, `prisma validate` and Prisma's config loader, Vitest's project resolution, and React server rendering of the root layout.
- **One-shot passable:** every solution only writes or edits files. No hidden test needs a file deleted or moved.
- **Arms:**
  - `alone`: the shared rules only.
  - `context7`: plus the Context7 MCP server and its "always use Context7" rule.
  - `stalemap-guard`: plus the block from `stalemap scan --all --examples` for this suite's template, and stalemap's post-edit guard hook (compile errors only, the default).
  - `context7-stalemap`: both.

  The notes are generated at run time by the stalemap build under test. On every invocation, run.ts appends that build to `build.jsonl` in the results folder: the commit, whether the checkout has uncommitted changes (and which paths), and a hash of `dist/`. analyze.ts prints the build and flags results that mix builds.
- **Modes:** `oneshot` (file tools only) and `checks` (can run `npm test`).
- **Limits:** a session that hits a plan or API limit before using any tool is retried after a backoff of 1 to 30 minutes, not scored.
- **Repetitions:** 3 per task × arm × mode, 240 sessions in all: `npx tsx bench/run.ts --suite heldout-v2 --arms alone,context7,stalemap-guard,context7-stalemap --examples --reps 3`. If plan limits force a smaller run, the number of repetitions done is reported. Results from a partial run are not presented as complete. Results go to `bench/results/<date>-heldout-v2` by default. run.ts won't add sessions to a folder that holds another suite's, and analyze.ts won't analyze a folder that mixes suites.

## Metrics

- **Primary:** pass rate (`tsc --noEmit` and hidden tests), per arm, for each mode and pooled.
- **Secondary:** stale API in final code and in first edit (this suite also scans `.prisma`, `.css` and `tsconfig.json` files). Where a default changed, the stale patterns flag code that relies on the old default: an `images` config without `qualities` or `minimumCacheTTL`, and smooth scrolling without `data-scroll-behavior`. In ts-path-alias, `baseUrl` without `ignoreDeprecations` is stale; with it, it compiles and counts as deprecated. Also: deprecated API used; `prisma.config.ts` present (prisma-upgrade); median cost, wall time and turns; Context7 calls; guard corrections.

## Analysis and reporting

- `npx tsx bench/analyze.ts bench/results/<dir> --out bench/heldout-v2/RESULTS.md`, the same analysis as the first suite.
- Differences between arms are computed per task and summarized with a 95% bootstrap interval over tasks (10,000 resamples, fixed seed). A difference is a win or a loss only when the interval excludes zero; otherwise it's a tie.
- Comparisons: `stalemap-guard` vs `alone`, `stalemap-guard` vs `context7`, `context7-stalemap` vs `context7` and `context7-stalemap` vs `stalemap-guard`, plus `context7` vs `alone`, which is exploratory context.
- Results are broken down by scenario and by kind, as well as overall. For each kind, the comparisons are repeated on that kind's tasks, both modes pooled. With six and four tasks, those intervals are wide.
- Everything is published: every arm and every task, including tasks and kinds where stalemap loses.
- Never pooled with the first held-out suite or the development tasks. The first suite's tasks shaped the fix this suite tests.

## Decision rule

Fixed before the run. "Pooled" means both modes together.

1. **stalemap helps:** `stalemap-guard` vs `alone`, all ten tasks, pooled, is a win.
2. **stalemap vs Context7:** `stalemap-guard` vs `context7`, all ten tasks, pooled, is reported as it comes out. Only a win supports "beats Context7", and a tie supports at most "on par with Context7". A per-mode claim, such as "in one-shot mode", needs that mode's own interval to exclude zero.
3. **The fix is confirmed** only if, on the six `type-checks` tasks pooled, `stalemap-guard` vs `alone` is a win and `stalemap-guard` vs `context7` is not a loss. Otherwise the report says the fix wasn't confirmed.
4. **Using both:** `context7-stalemap` vs `context7` and `context7-stalemap` vs `stalemap-guard`, pooled, are reported the same way. "Using both beats either alone" needs both to be wins. One win supports only "beats" that one arm.

Anything outside these comparisons is labeled exploratory, including `context7` vs `alone`, which analyze.ts marks that way. stalemap's notes and guard aren't changed in response to these tasks before the run. Changes made after seeing these results are post hoc, and confirming them needs a new blind suite.

## Task hashes

`find tasks/<task> -type f | sort | xargs shasum -a 256 | shasum -a 256`, run in `bench/heldout-v2`, first 16 hex digits. The template folder (`templates`) hashes to `393115f32b198ad0`.

| task | hash |
|---|---|
| ai-chat-history | `6ce62ce75d136589` |
| ai-test-model | `7d1882fadbb502b5` |
| ai-token-usage | `afe6811ffd70d0bd` |
| next-image-defaults | `43654456b0b7a670` |
| next-sitemaps | `b12ed84bf614a9e0` |
| next-smooth-scroll | `abc283de42c9c1e3` |
| prisma-upgrade | `c712205f712e3c46` |
| ts-path-alias | `80d96a4c12c87277` |
| vitest-projects | `c7060c3ce64371a0` |
| zod-derived-schema | `268f3920122d186d` |

## Deviations

(none yet)
