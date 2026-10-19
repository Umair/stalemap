# Held-out v2 benchmark results

`claude-sonnet-4-5` · 240 sessions · 10 tasks · up to 3 repetitions per cell · 0 sessions ended in an error (scored as failures).
Analysis as pre-registered in [PROTOCOL.md](PROTOCOL.md). Differences are per-task means of pass rates with 95% bootstrap intervals over tasks; a win or loss needs the interval to exclude zero.
stalemap build: `1ceb441`, dist `f83221b81e07`.

> **Results against third-party tools are withheld pending permission.** This run had four arms; two of them used a third-party docs tool, and their rows and the pre-registered comparisons with them (rules 2 and 4, and rule 3's second line) are left out of this file. The tool's calls were refused in every session that made one, which the harness didn't detect, so those comparisons didn't measure the tool anyway. The two arms below don't use it and are unaffected.

## One-shot (file tools only)

| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | guard corrections |
|---|---|---|---|---|---|---|---|---|
| alone | 3/30 (10%) | 77% | 67% | 7% | $0.046 | 29s | 6 | 0.0 |
| stalemap-guard | 6/30 (20%) | 80% | 70% | 10% | $0.063 | 37s | 7 | 0.8 |

| comparison | pass-rate difference | 95% interval | verdict |
|---|---|---|---|
| stalemap-guard vs alone | +10 pts | [-7, 30] | tie |

## With checks (can run npm test)

| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | guard corrections |
|---|---|---|---|---|---|---|---|---|
| alone | 11/30 (37%) | 50% | 72% | 10% | $0.086 | 45s | 8.5 | 0.0 |
| stalemap-guard | 15/30 (50%) | 40% | 61% | 10% | $0.101 | 51s | 8.5 | 2.4 |

| comparison | pass-rate difference | 95% interval | verdict |
|---|---|---|---|
| stalemap-guard vs alone | +13 pts | [-3, 33] | tie |

## Both modes pooled

| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | guard corrections |
|---|---|---|---|---|---|---|---|---|
| alone | 14/60 (23%) | 63% | 69% | 8% | $0.067 | 38s | 7 | 0.0 |
| stalemap-guard | 21/60 (35%) | 60% | 66% | 10% | $0.081 | 46s | 8 | 1.6 |

| comparison | pass-rate difference | 95% interval | verdict |
|---|---|---|---|
| stalemap-guard vs alone | +12 pts | [-3, 30] | tie |

## By scenario (both modes)

| scenario | alone | stalemap-guard |
|---|---|---|
| new-code | 14/48 | 21/48 |
| upgrade | 0/12 | 0/12 |

## By kind (both modes)

| kind | tasks | alone | stalemap-guard |
|---|---|---|---|
| compile-error | 4 | 8/24 (33%) | 12/24 (50%) |
| type-checks | 6 | 6/36 (17%) | 9/36 (25%) |

Comparisons on `compile-error` tasks only, both modes pooled:

| comparison | pass-rate difference | 95% interval | verdict |
|---|---|---|---|
| stalemap-guard vs alone | +17 pts | [-8, 42] | tie |

Comparisons on `type-checks` tasks only, both modes pooled:

| comparison | pass-rate difference | 95% interval | verdict |
|---|---|---|---|
| stalemap-guard vs alone | +8 pts | [-8, 33] | tie |

## By task (passes out of runs, one-shot / checks)

| task | scenario | alone | stalemap-guard |
|---|---|---|---|
| ai-chat-history | new-code | 0/3 · 1/3 | 2/3 · 3/3 |
| ai-test-model | new-code | 0/3 · 2/3 | 0/3 · 1/3 |
| ai-token-usage | new-code | 0/3 · 0/3 | 0/3 · 2/3 |
| next-image-defaults | upgrade | 0/3 · 0/3 | 0/3 · 0/3 |
| next-sitemaps | new-code | 0/3 · 0/3 | 0/3 · 0/3 |
| next-smooth-scroll | new-code | 0/3 · 0/3 | 0/3 · 0/3 |
| prisma-upgrade | upgrade | 0/3 · 0/3 | 0/3 · 0/3 |
| ts-path-alias | new-code | 0/3 · 3/3 | 0/3 · 3/3 |
| vitest-projects | new-code | 1/3 · 2/3 | 3/3 · 3/3 |
| zod-derived-schema | new-code | 2/3 · 3/3 | 1/3 · 3/3 |

## Decision rule

As fixed in [PROTOCOL.md](PROTOCOL.md#decision-rule) before the run. "Pooled" means both modes together.

| rule | comparison | difference | 95% interval | verdict | what it supports |
|---|---|---|---|---|---|
| 1. stalemap helps | stalemap-guard vs alone, all tasks, pooled | +12 pts | [−3, 30] | tie | **Not supported.** |
| 3. the fix is confirmed | stalemap-guard vs alone, `type-checks` tasks, pooled | +8 pts | [−8, 33] | tie (needs a win) | **The fix wasn't confirmed.** |

Rules 2 and 4 compared arms with the third-party tool and are withheld.

## What it means

These are the pre-registered results on 10 blind tasks, run once with 3 repetitions per cell, with no deviations from the protocol.

- **No pre-registered claim holds.** stalemap-guard passed 21/60 (35%), against 14/60 (23%) alone: +12 points [−3, 30], a tie, so this suite doesn't support "stalemap helps".
- **The fix for config keys and file conventions wasn't confirmed.** On the six `type-checks` tasks both arms scored 17–25%. Four of those six tasks went 0 in every arm: next-image-defaults, next-sitemaps, next-smooth-scroll and prisma-upgrade.
- **stalemap cost more, not less.** Pooled medians: $0.081 per session vs $0.067 alone, and 46 s vs 38 s. The guard added 1.6 corrections per session on average, 2.4 in checks mode.
- **Stale code was everywhere.** Stale API was left in the final code in 60–63% of sessions, and in the first edit in 66–69%.
- **Compared with the first held-out suite** (context only; the protocol forbids pooling): there stalemap-guard passed 83% and `alone` 50%. The suite was written to be hard for stalemap (six of ten tasks are changes a type checker can't catch), and it was hard for both arms.

## What stalemap's notes and guard covered (exploratory)

This is a diagnosis made after seeing the results; it doesn't change any verdict. For each task: whether the notes block the agents saw (`stalemap-notes.md` in the run's results folder, not in this repository yet) named the target change, whether stalemap's full report for the same template had it below the block's 1,800-token budget, and whether the guard could see it. "Score" is the changelog item's relevance score and "severity" the type change's, both as stalemap ranks them. The full report is `stalemap scan --all --json` with the same build and template.

| task | kind | in the notes? | in stalemap's full report? | guard can see it? | passes of 6: alone / stalemap-guard |
|---|---|---|---|---|---|
| ai-chat-history | type-checks | no | changelog only: "introduce responseMessages" (score 0). Nothing says `response.messages` changed meaning. | no | 1 / 5 |
| ai-test-model | compile-error | no | no: only `ai`'s main entry was diffed, not `ai/test` | partly: 60 findings in 80 edits, about the old `LanguageModelV1` types | 2 / 1 |
| ai-token-usage | compile-error | no | types: "`LanguageModelUsage`: removed `promptTokens`, `completionTokens`" (severity 6), below the cut. Not found: `cachedInputTokens` → `inputTokenDetails.cacheReadTokens`. | yes: 19 findings in 33 edits | 0 / 2 |
| next-image-defaults | type-checks | no | changelog: "bump default `images.minimumCacheTTL` from 1 min to 4 hours" (score 6), below the cut. The `qualities` default isn't there. | no | 0 / 0 |
| next-sitemaps | type-checks | no | changelog: "generateSitemap passes id as promise" (score −2), below the cut | no | 0 / 0 |
| next-smooth-scroll | type-checks | no | changelog: "[breaking]: enable router scroll optimization by default" (score 9), below the cut. It doesn't name `data-scroll-behavior`. | no | 0 / 0 |
| prisma-upgrade | type-checks | no; the block said `prisma` had "no notable API changes" | changelog: "`datasource.url` is now configured in the config file" (score 2), below the cut | no (a `.prisma` file) | 0 / 0 |
| ts-path-alias | compile-error | no; the block said `typescript` had "no notable API changes" | types: "On `CompilerOptions`, deprecated: `baseUrl`" (severity 4), below the cut | no: the guard checks only the edited file's diagnostics, and TS5101 is a project-options error. It ran on the `tsconfig.json` edits and reported nothing. | 3 / 3 |
| vitest-projects | compile-error | **yes**: "`defineWorkspace` was removed … use the `projects` field", with a Before → After | yes | yes: 16 findings in 24 edits | 3 / 6 |
| zod-derived-schema | type-checks | no | changelog: "`.pick()` and `.omit()` disallowed on object schemas containing refinements" (score 6), below the cut | no | 5 / 4 |

- **Covered:** the notes named one of the ten target changes (vitest-projects). That task is where stalemap-guard separated most clearly: 6/6, against 3/6 alone.
- **Detected but cut:** seven more were in stalemap's report, at least in part, but lost to higher-ranked changes when the block was cut to its 1,800-token budget: ai-token-usage, next-image-defaults, next-sitemaps, next-smooth-scroll, prisma-upgrade, ts-path-alias and zod-derived-schema. `--all` puts every direct dependency in the block.
- **Not detected:** two weren't in the report at all: `MockLanguageModelV4`, because the `ai/test` subpath wasn't diffed, and what `response.messages` holds now, since only the addition of `responseMessages` is there. Two others were only partly there: the report has nothing on Next's `images.qualities` default or on `data-scroll-behavior`.
- **ai-chat-history:** stalemap's agents wrote `result.responseMessages` in 5 of 6 sessions, against 1 of 6 alone. The notes didn't mention it, and only one of those six sessions read the installed types, so the mechanism is unclear.

## Where stalemap lost or didn't help

- **The four tasks no arm passed** (next-image-defaults, next-sitemaps, next-smooth-scroll, prisma-upgrade). The stale code type-checks, `npm test` in checks mode doesn't exercise the behavior, and the notes didn't mention the change. In next-sitemaps, 10 of 24 sessions also imported the catalog through an `@/` alias the template doesn't define.
- **ai-test-model:** stalemap-guard 1/6, against 2/6 alone. In every arm, 3 of 6 sessions silenced the type errors with `as any` or similar. The failing sessions inspected passed a mock result in an older shape, which fails at run time. In the stalemap arm the guard pushed agents to type-clean code (5 of 6 stalemap-guard sessions passed `tsc`, against 3 of 6 alone) but not to working code.
- **ts-path-alias in one-shot mode:** 0/3 in every arm. 11 of the 12 one-shot sessions kept `baseUrl` without `ignoreDeprecations` and failed `tsc` with TS5101; the twelfth dropped `baseUrl` but kept non-relative `paths` (TS5090). In checks mode every arm went 3/3. The guard could have caught it but doesn't look at `tsconfig.json` or project-options diagnostics.
- **zod-derived-schema:** stalemap-guard 4/6, against 5/6 alone. The zod 4.3 change was in stalemap's report but not in the notes.

## Run record

- **Build:** `1ceb441` ("Make API surface extraction hermetic") on branch `fix/hermetic-surface-extraction`, one commit ahead of `main`'s `4cacc7f`, clean checkout. The checkout was on that branch when the run started; the fix wasn't made in response to these tasks. Notes generated by a `4cacc7f` build for the same template are byte-identical to the ones these sessions got. `src/guard.ts` is the same in both commits, though its hints draw on the type diffs that the fix makes independent of the working directory. All 240 sessions were one invocation (one line in `build.jsonl`), so there are no mixed builds.
- **Before the run:** the suite hash was `f67095b1300b9b4a` and the templates hash `393115f32b198ad0`, both as in PROTOCOL.md. `validate.ts` reported "All tasks behave as expected", and the template was reinstalled per [../README.md](../README.md#run-it) with an unchanged lockfile.
- **Command:** `npx tsx bench/run.ts --suite heldout-v2 --arms <the four pre-registered arms> --examples --reps 3 --concurrency 3 --out bench/results/2026-10-16-heldout-v2`, run on 2026-10-16.
- **Totals:** 240 of 240 sessions in four arms.
- **Limits:** no limit errors and no retries.
- **Grading check:** for the four tasks no arm passed, the reference solution was laid over a copy of a session's own workspace, and it passed `tsc` and the hidden tests. The zeros are the agents', not the harness's.
- **Deviations:** none.

## Caveats

- **The intervals are over tasks only.** They ignore run-to-run variation within a task (3 repetitions per mode). With ten tasks, a few sessions can decide a verdict. The wide interval on stalemap-guard vs alone ([−3, 30]) means a real effect of that size can't be ruled out, but it isn't shown.
- **Floor effect.** Four of ten tasks scored 0 in every arm. They can't separate arms, and they pull every pass rate toward zero.
- **One model** (`claude-sonnet-4-5`, cutoff July 2025), and one run.
- **Same author.** The harness and stalemap share an author. The tasks were written by a separate session that didn't see stalemap's notes, renderer or guard, but it had seen the first suite's tasks and a summary of where stalemap lost (see [PROTOCOL.md](PROTOCOL.md#why-a-second-suite)).
- **Never pooled** with the first held-out suite or the development tasks.

Per the protocol, changes made to stalemap after seeing these results are post hoc. Confirming them needs a new blind suite.
