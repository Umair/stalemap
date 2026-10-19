# Held-out suite: post-hoc runs after the Next fixes

**Not a pre-registered result.** The fixes below were made after looking at where stalemap failed on these 10 tasks, so these runs show the fixes work on the cases that motivated them, nothing more. The pre-registered numbers stay in [RESULTS.md](RESULTS.md). A fresh, blind task set (`bench/heldout-v2/`) is needed before any public claim.

## What changed (unreleased, after 0.2.0)

In the pre-registered run, stalemap's clearest failures were two Next tasks, `next-cache-components` (2/6) and `next-upgrade` (0/6). Both turn on things that still type-check:

- **Moved config keys.** Agents wrote `experimental: { cacheComponents: true }` or kept `experimental.ppr`. Next 16's types mark both `@deprecated` (top-level `cacheComponents` replaces them), but the type diff only looked at `NextConfig`'s direct members. It now goes one level into nested config types. Keys deprecated with a named successor, or moved to the top level, become one note, grouped by successor. Earlier renames come from the changelog: "`experimental.{ppr, cacheComponents, dynamicIO, useCache}` → `cacheComponents`". The guard reports these keys although they compile.
- **Renamed file conventions.** Agents renamed the `middleware` export to `proxy` but kept `middleware.ts`. The guard now flags a root-level file named after a convention the dependency renamed. The changelog has to say so ("Deprecate `middleware` and recommend `proxy`") and a deprecation in the types has to agree. The guard also flags `proxy.ts` while `middleware.ts` still exists.
- **Hints.**
  - The guard picks the note for the innermost call (`tool()` inside `generateText()`).
  - It matches the compiler's quoted names against every type change, not only the ones in the notes block (`.errors` → "`ZodError`: removed `errors`").
  - It no longer falls back to changelog lines that only share a word with the file. That fallback had answered a `z.record()` error with "The email pattern dropped its lookaheads".
- Default block budget is now 1,800 tokens (was 1,500), so the new note doesn't crowd out others.

## Run 1: all 10 tasks, after the config-key and convention fixes

60 sessions of `stalemap-guard` (notes + guard), `claude-sonnet-4-5`, 3 repetitions, 0 errors. The `alone` row is the pre-registered run's sessions, unchanged. Results against third-party tools are withheld pending permission. Full table: [`results/2026-10-16-heldout-posthoc-merged/report.md`](../results/2026-10-16-heldout-posthoc-merged/report.md).

| | one-shot | with checks | pooled |
|---|---|---|---|
| alone | 11/30 (37%) | 19/30 (63%) | 30/60 (50%) |
| stalemap, pre-registered | 25/30 (83%) | 25/30 (83%) | 50/60 (83%) |
| **stalemap, post-hoc run 1** | 25/30 (83%) | **27/30 (90%)** | **52/60 (87%)** |

- `next-cache-components`: 6/6 (was 2/6).
- With checks: 90% at a median $0.081 and 7 turns.
- Still failing: `next-upgrade` 0/6 and `zod-upgrade` one-shot 1/3 (was 3/3).

## Run 2: the two cells that still failed, after two guard fixes

- **`next-upgrade` with checks: 3/3** (was 0/3). Agents had renamed the export inside `middleware.ts`, and the convention check only fired while the file still exported `middleware`. It now also fires on the half-migrated file. Median 12 turns, $0.118.
- **`zod-upgrade` one-shot: 3/3** (was 1/3). The failing runs had chased the misleading "email pattern" hint described above. It's gone, and `.errors` gets the right fact. Median 10 turns, $0.154.

Only these 6 sessions ran with the final code. If the other 54 sessions repeated their run-1 results, stalemap alone would be at 57/60, but that wasn't measured. A full re-run waits for the blind v2 suite.

## Caveats

- **Post-hoc, same author:** see the top.
- **`next-upgrade` can't pass one-shot for any arm.** Its hidden test requires `middleware.ts` to be gone, and one-shot sessions have no tool that deletes or moves files. In checks mode, `acceptEdits` lets `mv` through. This is a task-design flaw. The pre-registered scoring is unchanged, and v2 tasks avoid it.
- **Build:** run 2 used a `dist/` built from a working tree that also had other sessions' unfinished edits (agent setup, precomputed notes). The Claude Code hook path ran and logged the expected findings in every session.
- **One model** (`claude-sonnet-4-5`), 3 repetitions per cell.
