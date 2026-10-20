# Power note

How many tasks v4 needs, by simulation of the analysis PROTOCOL.md fixes: a two-level bootstrap (tasks, then runs within each task), with a comparison counted as a win when its interval lies above zero. [power.ts](power.ts) is v3's script with one addition (the interval level as a second argument).

## Assumptions

- **Runs per arm per task:** 6 per model (3 repetitions × 2 modes, pooled), as the protocol fixes.
- **Spread of per-task differences:** the standard deviation of per-task pass-rate differences between two arms is about 0.28, the figure v2 showed and v3 planned with. No v4 data informs it; the suite's author has seen no results of any suite beyond v3's protocol text.
- **Alone arm:** about 24% pass rate with many tasks at the floor or ceiling (logit-normal, mean −2.2, SD 2.6), as in v3. If `alone` passes more often on `claude-sonnet-5-5`, the per-task spread may change; the 0.28 figure is the main uncertainty.
- **Smallest effect worth claiming:** 12 points, as in v3.
- 400 simulated suites per cell and 1,000 bootstrap replicates each, so every figure is about ±2 points.

## Primary comparison (95% interval)

| tasks | +10 points | +12 points | +15 points |
|---|---|---|---|
| 40 | 56% | 71% | 91% |
| 47 | 62% | 76% | 95% |
| 56 | 70% | 82% | 95% |
| 64 | 78% | 89% | 98% |
| 72 | 80% | 92% | 99% |

## Each secondary comparison (98.3% interval)

| tasks | +12 points | +15 points | +20 points |
|---|---|---|---|
| 40 | 51% | 79% | 97% |
| 47 | 60% | 84% | 99% |
| 56 | 67% | 88% | 99% |
| 64 | 75% | 93% | 100% |
| 72 | 80% | 97% | 100% |

## What this means for the suite

**At least 56 tasks** give about 82% power for the primary comparison at +12 points; **about 64** give about 89%. The walk aims for about 64 tasks so the pilot can drop a few and leave at least 56. At 56–64 tasks a secondary comparison has about 67–75% power at +12 points and about 88–93% at +15, so a secondary "not shown" at a modest effect is weak evidence of no difference.

Reproduce:

```bash
npx tsx bench/heldout-v4/sampling/power.ts 0.12
```

```bash
npx tsx bench/heldout-v4/sampling/power.ts 0.12 0.983
```
