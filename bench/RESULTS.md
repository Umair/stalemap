# Benchmark results: claude-sonnet-4-5, 2026-10-16

Pilot run of [the benchmark](README.md): 8 tasks against `ai@7`, `zod@4` and `next@16`, all post-dating the model's July 2025 cutoff, one run per cell, headless Claude Code on a Claude plan. 80 sessions in total: the 48-session pilot, then two 16-session rounds of the stalemap setup with improved notes.

> **Results against third-party tools are withheld pending permission.** The pilot also had an arm with a third-party docs tool; its rows and the comparisons with it are left out of this file.

**Read this as directional.** One run per cell, and the stalemap notes were fixed *after* looking at the pilot's failures on these same tasks. The tasks didn't change, but a fair verdict on the improved notes needs tasks they weren't tuned on.

### One-shot (file tools only)

| setup | pass | stale API in final code | stale API in first edit | median cost | median time | median turns |
|---|---|---|---|---|---|---|
| agent alone | 3/8 | 75% | 75% | $0.038 | 21s | 4 |
| + stalemap, pilot notes (v0.1.0) | 3/8 | 25% | 25% | $0.060 | 26s | 3.5 |
| + stalemap, fixed notes | 7/8 | 25% | 25% | $0.044 | 29s | 3.5 |
| + stalemap, fixed notes + usage docs | 5/8 | 25% | 25% | $0.049 | 27s | 4 |

### With checks (can run npm test)

| setup | pass | stale API in final code | stale API in first edit | median cost | median time | median turns |
|---|---|---|---|---|---|---|
| agent alone | 5/8 | 25% | 75% | $0.095 | 53s | 10 |
| + stalemap, pilot notes (v0.1.0) | 5/8 | 25% | 63% | $0.089 | 46s | 7.5 |
| + stalemap, fixed notes | 7/8 | 0% | 13% | $0.065 | 33s | 6 |
| + stalemap, fixed notes + usage docs | 7/8 | 0% | 13% | $0.054 | 28s | 4.5 |

### Per task (one-shot / checks)

| task | alone | stalemap pilot | stalemap fixed | stalemap + docs |
|---|---|---|---|---|
| ai-messages | ✗ / ✓ | ✗ / ✓ | ✓ / ✓ | ✓ / ✓ |
| ai-multistep | ✗ / ✗ | ✗ / ✗ | ✗ / ✗ | ✗ / ✓ |
| ai-tool | ✗ / ✗ | ✗ / ✗ | ✓ / ✓ | ✓ / ✓ |
| next-proxy | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ |
| next-revalidate | ✗ / ✓ | ✗ / ✓ | ✓ / ✓ | ✗ / ✓ |
| zod-enum | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ |
| zod-field-errors | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ |
| zod-signup | ✗ / ✗ | ✗ / ✗ | ✓ / ✓ | ✗ / ✗ |

Costs are Claude Code's API-equivalent estimates. "Stale API" means the task's known-stale patterns (see each task's `meta.json`).

## What it shows

1. **Without help, the model writes stale code.** Alone in one-shot mode it passed 3/8, with stale APIs in 75% of final files: `maxSteps`, tool `parameters`, `convertToCoreMessages`, zod's `required_error`, one-argument `revalidateTag`. Being able to run `tsc` raised it to 5/8, but its *first* edit was still stale 75% of the time.
2. **stalemap's first notes (v0.1.0) cut stale code but didn't raise the pass rate.** They said what had been removed, not what replaced it. The agent avoided `parameters` but guessed `schema:`, dropped `maxSteps` without adding `stopWhen`, and in one case skipped `tool()` entirely. The notes also missed key changes for packages the code didn't import yet.
3. **After fixing that, stalemap reached 12–14 of 16**, against 8/16 alone. With checks it was cheaper and faster than the agent alone: median $0.054–0.065 vs $0.095, 28–33s vs 53s. It made no tool calls.
4. **Agents sometimes ignore correct notes.** In the last round the agent still wrote `maxSteps: 5` next to a note saying `generateText()` no longer accepts it. It also wrote `revalidateTag("posts")` next to a note saying `profile` is required. Static notes in the system prompt compete with strong training priors, and that limits what notes alone can do.

## What changed in the notes between rounds

All of these are generic changes to stalemap, not task-specific text. They're the source of the 0.1.0 → current difference (unreleased, in the repo):
- **Replacements:** removed options name their successors, from changelog renames (`maxTokens` → `maxOutputTokens`) and from new options the changelog mentions (`stopWhen`).
- **Required properties in unions:** a property required in every member of a union type is now reported ("`tool()` now requires `inputSchema`").
- **Merged swaps:** removed exports with known successors share one line (`CoreMessage` → `ModelMessage`, `convertToCoreMessages` → `convertToModelMessages`).
- **Unimported packages:** these now get their changelog-backed breaking changes, with public subpaths discovered (`next/cache`, `next/server`).
- **Usage docs (last round):** required parameters show their type (`profile: string | CacheLifeConfig`), and new options carry their JSDoc and `@default` (`stopWhen`: "…default `isStepCount(1)`").

## Next

- **A fair test of the current notes:** new tasks written without looking at stalemap's output, 3 runs per cell.
- **A guard hook:** after each Write/Edit, type-check the touched file against the pinned versions and tell the agent right away when it used a removed API. The failures above are cases where the agent had the right information and ignored it. A check at edit time doesn't depend on the agent remembering the note.
- **More models:** `claude-haiku-4-5` (older cutoff) and a local model.

## Round 4 (development tasks): verified examples and the edit-time guard

32 more sessions on the same 8 development tasks, added after the rounds above. Like those rounds, this is tuning on tasks we've seen, so it's not a verdict.

| setup | one-shot pass | with-checks pass | median cost (one-shot / checks) | median time |
|---|---|---|---|---|
| + stalemap: notes with verified examples | **8/8** | **8/8** | $0.052 / $0.059 | 28s / 29s |
| + stalemap: notes with examples + guard (reporting deprecations) | 7/8 | 7/8 | $0.051 / $0.059 | 28s / 34s |

- **Verified examples helped most.** Each top note now carries a Before → After line that was compiled against the pinned version: `maxSteps: 5` → `stopWhen: isStepCount(5)`, `revalidateTag('posts')` → `revalidateTag('posts', 'max')`, `NextMiddleware` → `NextProxy`. With them, the notes passed 16/16, with no tool calls.
- **The guard's two failures were caused by deprecation warnings.** It told the agent to replace `.flatten()` and `.email()`, which are deprecated but still work. The rewrites broke working code (`z.treeifyError` returns a different shape; the agent reintroduced zod 3's `issue.received`). The guard now reports only code that doesn't type-check against the installed versions; deprecations are opt-in (`STALEMAP_GUARD_DEPRECATIONS=1`).

The fair test is the held-out suite: [heldout/PROTOCOL.md](heldout/PROTOCOL.md), with 10 new tasks covering new code, pinned older versions and upgrades.
