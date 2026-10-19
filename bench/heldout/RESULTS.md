# Held-out benchmark results

`claude-sonnet-4-5` · 240 sessions · 10 tasks · up to 3 repetitions per cell · 0 sessions ended in an error (scored as failures).
Analysis as pre-registered in [PROTOCOL.md](PROTOCOL.md). Differences are per-task means of pass rates with 95% bootstrap intervals over tasks; a win or loss needs the interval to exclude zero.

> **Results against third-party tools are withheld pending permission.** This run had two more arms that used a third-party docs tool, and the pre-registered comparisons against them are left out of this file. An earlier version of this file, and the README of the npm release 0.2.0, said stalemap beat that tool in one-shot mode. That claim is withdrawn: after the run it turned out that the tool's calls were refused in most sessions from the second repetition on, which the harness didn't detect, so those comparisons didn't measure the tool. The two arms below don't use it and are unaffected.

## One-shot (file tools only)

| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | guard corrections |
|---|---|---|---|---|---|---|---|---|
| alone | 11/30 (37%) | 53% | 43% | 20% | $0.041 | 22s | 4 | 0.0 |
| stalemap-guard | 25/30 (83%) | 0% | 23% | 20% | $0.061 | 36s | 4 | 0.9 |

| comparison | pass-rate difference | 95% interval | verdict |
|---|---|---|---|
| stalemap-guard vs alone | +47 pts | [20, 73] | **win** |

## With checks (can run npm test)

| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | guard corrections |
|---|---|---|---|---|---|---|---|---|
| alone | 19/30 (63%) | 23% | 37% | 20% | $0.104 | 53s | 10.5 | 0.0 |
| stalemap-guard | 25/30 (83%) | 3% | 17% | 20% | $0.072 | 39s | 5 | 0.9 |

| comparison | pass-rate difference | 95% interval | verdict |
|---|---|---|---|
| stalemap-guard vs alone | +20 pts | [0, 43] | tie |

## Both modes pooled

| arm | pass | stale API in final code | stale in first edit | deprecated | median cost | median time | median turns | guard corrections |
|---|---|---|---|---|---|---|---|---|
| alone | 30/60 (50%) | 38% | 40% | 20% | $0.051 | 26s | 5.5 | 0.0 |
| stalemap-guard | 50/60 (83%) | 2% | 20% | 20% | $0.064 | 37s | 5 | 0.9 |

| comparison | pass-rate difference | 95% interval | verdict |
|---|---|---|---|
| stalemap-guard vs alone | +33 pts | [12, 57] | **win** |

## By scenario (both modes)

| scenario | alone | stalemap-guard |
|---|---|---|
| new-code | 20/30 | 26/30 |
| pinned-version | 6/12 | 12/12 |
| upgrade | 4/18 | 12/18 |

## By task (passes out of runs, one-shot / checks)

| task | scenario | alone | stalemap-guard |
|---|---|---|---|
| ai-structured | new-code | 3/3 · 3/3 | 3/3 · 3/3 |
| ai-upgrade | upgrade | 0/3 · 1/3 | 3/3 · 3/3 |
| ai6-steps | pinned-version | 0/3 · 0/3 | 3/3 · 3/3 |
| next-cache-components | new-code | 0/3 · 0/3 | 1/3 · 1/3 |
| next-upgrade | upgrade | 0/3 · 0/3 | 0/3 · 0/3 |
| zod-function | new-code | 0/3 · 3/3 | 3/3 · 3/3 |
| zod-issues | new-code | 3/3 · 3/3 | 3/3 · 3/3 |
| zod-record | new-code | 2/3 · 3/3 | 3/3 · 3/3 |
| zod-upgrade | upgrade | 0/3 · 3/3 | 3/3 · 3/3 |
| zod41-payment | pinned-version | 3/3 · 3/3 | 3/3 · 3/3 |

## What it means

These are the pre-registered results on 10 tasks written before stalemap ran on them, 3 repetitions per cell, with no deviations from the protocol.

- **Pooled, stalemap beat no help:** 83% vs 50% (+33 points, interval [12, 57], a win).
- **One-shot (no way to run checks):** 83% vs 37% (+47 points, [20, 73], a win), with stale APIs in 0% vs 53% of final code.
- **With checks:** 83% vs 63% (+20 points, [0, 43]), a tie by the pre-registered rule. stalemap was cheaper (median $0.072 vs $0.104) and used about half the turns (5 vs 10.5).
- **By scenario:** on projects pinned to older versions, 12/12 vs 6/12; on upgrades of broken code, 12/18 vs 4/18; on new code, 26/30 vs 20/30.

## Where stalemap lost or didn't help

- **next-cache-components** (stalemap 2/6) and **next-upgrade** (0/6). Both turn on Next 16 config and file conventions that are deprecated but still type-check: `experimental.cacheComponents` → top-level `cacheComponents`, `experimental.ppr`, `middleware.ts` → `proxy.ts`. The guard only reported compile errors (deprecations are off by default since the development rounds), and the notes didn't cover config keys or file conventions. This was fixed later (see below), but the fix isn't applied to these results.
- **zod41-payment** didn't separate the arms: all passed.

## Caveats

- **One model** (`claude-sonnet-4-5`, cutoff July 2025), whose cutoff is well before these versions. Newer models will have smaller gaps.
- **Same author.** The tasks, the harness and stalemap are by the same author. The tasks were frozen (hash in PROTOCOL.md) before stalemap ran on them.
- **Ten tasks.** Intervals are wide, and one task moving by three sessions moves a pooled rate by 5 points.

## After these results

The Next losses above were fixed after this run, and the fixes were checked on these same tasks. That makes those runs post-hoc, not confirmatory: see [POSTHOC.md](POSTHOC.md). One task-design flaw turned up along the way: `next-upgrade` can't pass in one-shot mode for any arm, because its hidden test requires deleting `middleware.ts` and one-shot sessions have no tool that deletes files. The numbers above are unchanged.
