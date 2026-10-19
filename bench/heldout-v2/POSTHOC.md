# Held-out v2: post-hoc runs

**Not a pre-registered result.** Everything here was done after seeing the v2 results, on the same 10 tasks, so it can show what limited stalemap on this suite and whether the changes fix the cases that motivated them, nothing more. The pre-registered numbers stay in [RESULTS.md](RESULTS.md). Confirming any of it needs a new blind suite (v3).

## 1. Oracle: what a note naming the change can do (exploratory)

The v2 diagnosis was that stalemap's notes named only 1 of the 10 target changes. To see how much a note can do when it does name the change, the `oracle` arm appends one hand-written line per task instead of stalemap's block, with no guard. Each line restates the task's "what changed" entry in [PROTOCOL.md](PROTOCOL.md), for example "`next` 16: `images.qualities` now defaults to `[75]` (any quality was allowed before) and `images.minimumCacheTTL` to 14400 seconds (was 60)." All ten lines are in [arms/oracle/heldout-v2.json](../arms/oracle/heldout-v2.json).

60 sessions: `claude-sonnet-4-5`, both modes, 3 repetitions, 0 errors, no limit retries. The other arms are v2's pre-registered sessions: same suite, model and day, but a separate run. Results: [results/2026-10-16-heldout-v2-oracle](../results/2026-10-16-heldout-v2-oracle/report.md).

| arm | one-shot | checks | pooled | median cost | median turns |
|---|---|---|---|---|---|
| alone (v2) | 3/30 | 11/30 | 14/60 (23%) | $0.067 | 7 |
| stalemap-guard (v2) | 6/30 | 15/30 | 21/60 (35%) | $0.081 | 8 |
| **oracle** | **17/30** | **23/30** | **40/60 (67%)** | **$0.059** | **6** |

| task | alone | stalemap-guard | oracle |
|---|---|---|---|
| ai-chat-history | 0/3 · 1/3 | 2/3 · 3/3 | 3/3 · 3/3 |
| ai-test-model | 0/3 · 2/3 | 0/3 · 1/3 | 0/3 · 1/3 |
| ai-token-usage | 0/3 · 0/3 | 0/3 · 2/3 | 3/3 · 3/3 |
| next-image-defaults | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 2/3 |
| next-sitemaps | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 3/3 |
| next-smooth-scroll | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| prisma-upgrade | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 0/3 |
| ts-path-alias | 0/3 · 3/3 | 0/3 · 3/3 | 2/3 · 3/3 |
| vitest-projects | 1/3 · 2/3 | 3/3 · 3/3 | 0/3 · 2/3 |
| zod-derived-schema | 2/3 · 3/3 | 1/3 · 3/3 | 3/3 · 3/3 |

Passes, one-shot · checks. Per-task differences with the same bootstrap as [analyze.ts](../analyze.ts), against arms from a different run, so only a rough guide:

| comparison | all tasks | `type-checks` tasks | `compile-error` tasks |
|---|---|---|---|
| oracle vs alone | +43 pts [17, 70] | +56 pts [25, 83] | +25 pts [−17, 71] |
| oracle vs stalemap-guard | +32 pts [3, 58] | +47 pts [19, 75] | +8 pts [−42, 50] |

**The four tasks every arm failed (0/24 each):**

- **next-image-defaults: 5/6.** The one failure set `qualities: []` instead of listing the qualities the app uses.
- **next-smooth-scroll: 6/6.** Every session set `data-scroll-behavior="smooth"` on `<html>`.
- **next-sitemaps: 3/6, all with checks.** All three one-shot sessions imported the catalog through an `@/` alias the template doesn't define (TS2307), which has nothing to do with Next. With checks, `tsc` showed them the error and they fixed it.
- **prisma-upgrade: 0/6.** The exact hint wasn't enough. All six sessions wrote the old datasource shape into the new file, `export default { datasources: { db: { url: process.env.DATABASE_URL } } }`, and five put `prisma.config.ts` in `prisma/` instead of the project root. None used `defineConfig` from `prisma/config` with a top-level `datasource`. A note that says where the setting went, but not the new file's location and shape, doesn't fix this task.

So three of the four become passable once the note names the change, and the fourth needs more than a name.

**Where the oracle did no better than stalemap-guard:**

- **vitest-projects: 2/6, against 6/6 for stalemap-guard.** In one-shot mode all three sessions used `test.projects` as the note says, but put `name` on the project object instead of under its `test` key (TS2769). The guard reports that compile error, and the oracle arm has no guard. The note and the guard each fix what the other can't.
- **ai-test-model: 1/6.** The note names `MockLanguageModelV4`, but agents still returned the v1 result shape (`usage: { promptTokens, completionTokens }`, `text`). In one-shot mode that fails `tsc`. With checks, two of the three failures silenced the error with `as any`, which passes `tsc` and fails the hidden test.

**What it means:** on this suite most of v2's gap was coverage. When the notes named the change, the agents mostly used it, and the six `type-checks` tasks went from 17–25% in every arm to 72% (26/36) with the oracle. The oracle was also the cheapest arm.

## 2. What changed in stalemap (unreleased)

Made after the oracle run, from what v2 and the oracle showed. Every rule is general: nothing names a package or a task, except the TypeScript compiler-options note, which is about TypeScript by design. Tests for each are in `test/`.

- **Notes ranked for the guard.** With the post-edit guard on (`scan --guard`, or detected from the hooks `stalemap setup` writes and the Claude Code plugin), the block's budget goes first to release notes about changes that still type-check: a changed default, a behavior change, a setting or schema field that moved. Explicitly breaking release notes come next. Type removals and renames, which the guard reports as compile errors once the agent uses them, and deprecations, which still work, come after. A note that names the code it's about ranks above one that doesn't, and a heading's items are reduced to the one that says the most.
- **Edit-time notes.** After an edit, even with no compile error, the guard mentions up to three changes from below the cut that still type-check and whose names the edited text uses. That includes files nothing imports: `tsconfig.json`, `*.prisma` and `<package>.config.*`. Each note shows once per session, and not when the block already says it. Matching on an object alone (`images` for `images.minimumCacheTTL`) is allowed only for changed defaults and moved settings, since code that relies on a default never names it.
- **Guard gaps.** An edited `tsconfig.json` gets the compiler-option errors `tsc` stops on, from the project's own TypeScript (TS5101 for `baseUrl`, TS5090 for non-relative `paths` without it). `as any`, `@ts-ignore` and `@ts-expect-error` are flagged when they sit on code that uses an API from the change set, or on a value whose type comes from a changed package.
- **Coverage.** `--all` also diffs entry points nothing imports, test helpers included (`ai/test`). A removed export with a higher-versioned sibling names it as its replacement (`MockLanguageModelV1` → `MockLanguageModelV4`). When the project has a `tsconfig.json`, TypeScript's deprecated compiler options and option values get one note.
- **Harness.** Guard arms get notes from `scan --guard`. The notes project gets the template's `tsconfig.json` as well as its `package.json`; v2's notes project had no `tsconfig.json`. The hook gets the notes through `STALEMAP_NOTES_FILE`, so it can skip what they already say.

What the agents get now for each target change, from the re-run's [notes](../results/2026-10-16-heldout-v2-posthoc/stalemap-notes-guard.md) and the guard:

| task | in the notes block (v2 → now) | edit-time note or guard |
|---|---|---|
| ai-chat-history | no → no | no: nothing in the report says `response.messages` changed meaning |
| ai-test-model | no → partly: "`MockLanguageModelV1` → `MockLanguageModelV4`" | compile errors as before; `as any` on the mock is now flagged |
| ai-token-usage | no → no: the `LanguageModelUsage` removal ranks below the cut now | compile errors, as before |
| next-image-defaults | no → yes: "next/image only allow quality 75 by default", "bump default `images.minimumCacheTTL` from 1 min to 4 hours" | `images` in `next.config.ts` gets the TTL note if the block didn't |
| next-sitemaps | no → no | "generateSitemap passes id as promise" when the file defines `generateSitemaps` |
| next-smooth-scroll | no → partly: "enable router scroll optimization by default", which doesn't name `data-scroll-behavior` | no |
| prisma-upgrade | no → partly: "populate the datasource in the config file" (about `migrate diff` flags), "the move to `prisma.config.ts`" | "`datasource.url` is now configured in the config file" on `schema.prisma` |
| ts-path-alias | no → yes: the compiler-options note names `baseUrl`, TS5101 and `ignoreDeprecations` | TS5101 / TS5090 when `tsconfig.json` is edited |
| vitest-projects | yes → no: the `defineWorkspace` removal now ranks below the cut. Only "Inline projects extend the root config by default" is left | compile errors for `defineWorkspace` and `workspace`, as before |
| zod-derived-schema | no → yes: "`.pick()` or `.omit()` on object schemas with refinements now throws an error" | the same note on `.pick()` if the block didn't have it |

## 3. Re-run with the new build (post hoc)

60 sessions of the `stalemap-guard` arm only: `claude-sonnet-4-5`, both modes, 3 repetitions, 0 errors, no limit retries, $10.67 API-equivalent. The build was commit `ba4c274`, clean, with the changes in section 2. Two noise filters were added afterwards (`b9310e9`: list labels, and keys that only name the package), and the branch was then merged with `fix/v2-coverage-gaps` (`4b0de20`), which changes how tsconfig option errors are found and adds config-file usage and `--guides`. Neither has been re-run. The other arms are v2's pre-registered sessions, from an earlier run of the same suite and model on the same day. Results: [results/2026-10-16-heldout-v2-posthoc](../results/2026-10-16-heldout-v2-posthoc/report.md).

| arm | one-shot | checks | pooled | median cost | median turns |
|---|---|---|---|---|---|
| alone (v2) | 3/30 | 11/30 | 14/60 (23%) | $0.067 | 7 |
| stalemap-guard (v2) | 6/30 | 15/30 | 21/60 (35%) | $0.081 | 8 |
| **stalemap-guard (post hoc)** | **10/30** | **17/30** | **27/60 (45%)** | **$0.097** | **8.5** |
| oracle | 17/30 | 23/30 | 40/60 (67%) | $0.059 | 6 |

| task | stalemap-guard (v2) | stalemap-guard (post hoc) | oracle |
|---|---|---|---|
| ai-chat-history | 2/3 · 3/3 | 2/3 · 3/3 | 3/3 · 3/3 |
| ai-test-model | 0/3 · 1/3 | 0/3 · 1/3 | 0/3 · 1/3 |
| ai-token-usage | 0/3 · 2/3 | 0/3 · 2/3 | 3/3 · 3/3 |
| next-image-defaults | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 2/3 |
| next-sitemaps | 0/3 · 0/3 | 0/3 · **3/3** | 0/3 · 3/3 |
| next-smooth-scroll | 0/3 · 0/3 | 0/3 · 0/3 | 3/3 · 3/3 |
| prisma-upgrade | 0/3 · 0/3 | 0/3 · 0/3 | 0/3 · 0/3 |
| ts-path-alias | 0/3 · 3/3 | **3/3** · 3/3 | 2/3 · 3/3 |
| vitest-projects | 3/3 · 3/3 | 3/3 · 2/3 | 0/3 · 2/3 |
| zod-derived-schema | 1/3 · 3/3 | **2/3** · 3/3 | 3/3 · 3/3 |

Same bootstrap as section 1, against arms from a different run, so only a rough guide:

| comparison | all tasks | `type-checks` tasks | `compile-error` tasks |
|---|---|---|---|
| post hoc vs alone | +22 pts [5, 38] | +19 pts [0, 42] | +25 pts [−4, 46] |
| post hoc vs stalemap-guard (v2) | +10 pts [−2, 25] | +11 pts [0, 28] | +8 pts [−12, 38] |
| oracle vs post hoc | +22 pts [−5, 50] | +36 pts [6, 69] | +0 pts [−37, 46] |

**What moved:**

- **ts-path-alias, one-shot 0/3 → 3/3.** The compiler-options note named `baseUrl` and TS5101. All six sessions kept `baseUrl` and added `"ignoreDeprecations": "6.0"`, which the task accepts but its rules count as using a deprecated API. The note offers both fixes; the agents took the one-line escape hatch, not the migration.
- **next-sitemaps, checks 0/3 → 3/3.** The edit-time note "generateSitemap passes id as promise" fired in all six sessions, and all six awaited `id`. One-shot still failed 0/3, on an unrelated `@/src/catalog` import the template doesn't map (TS2307), the same failure the oracle had.
- **zod-derived-schema, one-shot 1/3 → 2/3**, with the `.pick()` note now in the block.
- **vitest-projects, 6/6 → 5/6.** The `defineWorkspace` note now ranks below the cut, as intended (the guard reports it). The one failure exported an array of configs, the old workspace-file shape, instead of using `test.projects`.

**Still 0/6:**

- **next-image-defaults.** Both changes were in the block this time. All six sessions set `minimumCacheTTL: 60`, and none set `images.qualities`. The changelog line is "next/image only allow quality 75 by default", which never names the setting; the oracle's line named `images.qualities` and got 5/6. stalemap can't name a key the release notes don't, so this needs another source, such as the upgrade guide.
- **next-smooth-scroll.** The only related note is "enable router scroll optimization by default", which doesn't mention `data-scroll-behavior`.
- **prisma-upgrade.** Edit-time notes fired in all six sessions (`datasource.url` moved to the config file), and the guard reported `defineConfig` imported from `prisma` instead of `prisma/config` (TS2305). Every session then dropped `defineConfig` and kept `url` in `schema.prisma`: five wrote a config holding only `schema`, one the old `datasources: { db: { url } }` shape. The oracle also went 0/6, so a name alone isn't enough here.

Edit-time notes showed up in 32 of the 60 sessions.

## Caveats

- **Results against third-party tools are withheld pending permission.** v2 also had two arms with a third-party docs tool; their rows and the comparisons with them are left out of this file.
- Everything above is post hoc: the changes were made after looking at these 10 tasks, and only the stalemap arm was re-run. Whether the gain holds on changes nobody tuned for is what held-out v3 tests.
- 10 tasks and 3 repetitions: one task moving by 3 sessions moves the pooled rate by 5 points.
