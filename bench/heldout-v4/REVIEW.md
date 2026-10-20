# heldout-v4: independent blind review before the pilot

An independent check of the frame, population, draw and walk (draws 1–170: 66 tasks, 104 skips) and of all 66 built tasks, as of commit `960adbd`, done before the oracle pilot and the freeze, as for v2 and v3. Nothing in the suite was changed by this review; every finding below says what to change and who should decide.

**Verdict:** the sampling is sound and the tasks are in good shape. The frame, population, seeded order and walk all check out mechanically and on spot checks, every skip's criterion fits its reason, and no task reuses a v1–v3 change. All 66 tasks pass `validate.ts` (on Node 22.22.3, and on Node 24.18.0 as well), every stale variant passes on the pre-cutoff version of its package once harness artifacts are removed, so each fails on the pinned version *because of the drawn change*, and every solution passed its hidden tests in three separate runs.

Two things should be settled before the pilot:

1. **Blocker (harness):** Vite and Vitest write caches into the template's shared `node_modules`, and the Vitest module cache holds transformed source from whatever workspace ran last. After `validate.ts` that includes reference solutions. During the benchmark it would include other sessions' and other arms' code, all readable by every later session.
2. **Blocker (2 tasks):** `next-og-share-card` and `zod-typed-queue-jobs` fail working code on a deprecation signal the prompt never asks the agent to avoid. Each needs one sentence added to its prompt, as the other five deprecation tasks have.

Counts: **2 blockers, 4 should-fix, 7 minor.**

**Applied on 2026-10-20 at the owner's request** (by the reviewer, same blindness rules). `validate.ts` passes on all nine touched tasks.

- **B1** is fixed in the harness (per-session `node_modules` of symlinks), not in the suite.
- **B2:** "We keep this codebase free of deprecated APIs." is added to both prompts. `"deprecat"` is dropped from both tasks' `newApi` patterns, since the required sentence would otherwise match them.
- **S1:** the registry request came from Next's agent-upgrade security-advisory check (`experimental.agentUpgrade`, default `"security"`; no environment variable turns it off). The hidden test now wraps the build copy's `next.config.*` to set `agentUpgrade: false`, keeping the rest of the project's config. With the network probe, the build made no outbound connection for the solution, the alternative or the stale variant. A function-style `next.config.mjs` also passed with non-loopback DNS denied.
- **S2:** all six patterns are narrowed as the table suggests. For vitest-ci-test-settings the pattern now flags `{ vitestConfig } = await resolveConfig` destructuring and `.vitestConfig` access; for preact-activity-heatmap it flags only numeric expressions. Each still flags its stale variant, and none flags the reference, the alternatives or the correct variants listed in S2.
- **S3** and **S4** are recorded in PROTOCOL.md (walk note 3, and a Node.js line under Setup).
- **Minor 2** (applied in a second pass): the oracle hints of `vitest-coverage-upgrade`, `firebase-coupon-error-reason` and `multer-parts-cap-upgrade` now use generic examples (`'*.test.ts'`/`'dir/**'`, `"Not found [404]"`, "set parts to the real maximum, with no extra allowance") instead of the task's own globs, coupon message and +1 workaround. `validate.ts` passes on all three.
- Minor items 1 and 3 are left for the owner. Rulings on the author's flagged items are in [Flagged items](#flagged-items).

## How it was reviewed

- **Blindness.** The reviewer did not run stalemap or any agent session. It did not read `src/`, `dist/`, `bench/results/**`, any `stalemap-notes*.md`, `bench/arms/stalemap*.md`, `examples/`, any RESULTS.md or POSTHOC.md, anything under `~/.claude`, any hand-over notes outside the suite folder, or other sessions' transcripts. It read the harness (`bench/run.ts` for concurrency, grading and the scanned-file rule), everything in `bench/heldout-v4/`, and `bench/heldout-v3/` (REVIEW.md, population, walk, tasks). It also read v1/v2 task metas and prompts to check spent changes. Package code under `bench/.work/` (template and old installs) was read where a claim turned on package behavior. (While checking for a hung build, `ps` showed process names from another worktree's benchmark run. They were not inspected.)
- **Mechanical checks** (scratch scripts in the reviewer's scratchpad):
  - recomputed every rank `sha256("heldout-v4:20260630:<id>")` and compared it with `draw.md`;
  - checked that the walk is a gap-free prefix of the order;
  - matched outcome counts with PROTOCOL.md;
  - checked population dates, versions and pins against `frame.json`'s releases in the window;
  - matched task `change` ids against v1–v3 task metas, v3's walk and `spent.md`;
  - checked that every v3 population entry in v4's window and frame appears in v4 under the same id (all 121 do).
- **Tasks.** Read every task's `task.md`, `meta.json`, `files/`, `hidden/`, `solution/`, `stale/` and `alt/`. Ran `validate.ts` on all 66 tasks twice: once on Node 22.22.3 (7.5 min, "All tasks behave as expected") and once on Node 24.18.0 for the firebase question (identical table).
- **Stale and solution variants on the old versions.** Each task's stale variant and reference solution were graded (`tsc --noEmit` and the hidden tests) with the package overlaid at its last version before 2026-06-01, using the installs in `bench/.work/old/` (each confirmed by `npm view` time to be the last stable release before June on the current major line). The overlay is a per-workspace `node_modules` made of symlinks to the template's packages, with the old install's packages substituted. Workspaces are in `bench/.work/review-v4/old/`.
- **Hidden-test properties.** Every solution's hidden tests were run twice more under a preload that logs any non-loopback DNS lookup or TCP connect, and timed. The one task that tried the network was rerun with DNS denied. `jest-fixture-path-helper` was rerun by file name, because a `test/hidden/*` glob picks up the folder its test creates (minor 1).
- **Skips.** All 104 reasons were read against their criteria. 16 of the claims behind skips were checked against the installed packages (see [Skips](#skips)).

## Blockers

### B1. Shared Vite/Vitest caches leak code between workspaces (harness; 10 tasks)

**Evidence.** Every workspace symlinks `node_modules` to `bench/.work/template-heldout-v4-latest/node_modules`, so tools that cache "in node_modules" write into the shared install. Starting from a clean template, running `validate.ts --tasks <t>` one task at a time created:

| task | `.vite` | `.vite-temp` | `.vitest-cache` |
|---|---|---|---|
| vite-admin-page-build | | ✓ | |
| vitest-ci-attachments | | ✓ | |
| vitest-ci-test-settings | | ✓ | ✓ |
| vitest-coverage-upgrade | | ✓ | ✓ |
| vitest-dom-project-platform | ✓ | ✓ | ✓ |
| vitest-full-case-titles | ✓ | ✓ | ✓ |
| vitest-list-test-names | | ✓ | ✓ |
| vitest-module-cache-dir | | ✓ | ✓ |
| vitest-restock-flow-order | ✓ | ✓ | ✓ |
| vitest-slug-case-names | ✓ | ✓ | ✓ |

`.vitest-cache` holds the transformed source of every module Vitest ran. After the full validate run it contained both `test.each(...)("slugify '$input'", ...)` (the reference solution of `vitest-slug-case-names`) and `"slugify $input"` (its stale variant). In the benchmark (`run.ts`, concurrency 3, one shared template) the hidden-test grading of each session would add that session's code. A later session that greps `node_modules`, which agents do when looking up an API, could find a reference solution or another arm's answer. The odds are low, but the result is the launch claim, and contamination between arms biases the comparison in an unknown direction. Concurrent writes to one cache are also a correctness risk. AUTHORING.md's walk notes already say the owner clears these before the freeze, but that does not cover the runs themselves.

**Fix (pick one, before the pilot):**
- *Preferred:* give each workspace its own `node_modules` directory whose entries are symlinks to the template's entries, instead of one symlink to the whole folder, in both `run.ts` and `validate.ts`. Packages still resolve their dependencies from the template (Node follows realpaths), but `node_modules/.vite`, `.vite-temp` and `.vitest-cache` then land in the workspace. The reviewer's old-version harness used exactly this layout for all 66 tasks without trouble.
- *Or:* have `run.ts` and `validate.ts` delete those three folders from the template before every session and every grading step (racy at concurrency > 1). Where a hidden test starts Vitest itself, it should also pass a temp `cacheDir` and `fsModuleCache: false`, as `vitest-ci-attachments` does. Hidden tests alone can't fix this: in `vitest-ci-test-settings` and `vitest-list-test-names` the agent's own code creates the Vitest instance, and Vite's config loader writes `.vite-temp` whatever the options.
- Either way, add a check to `validate.ts` that the template's top-level `node_modules` entries are unchanged after a run, and clear the current caches. This review removed the ones its own runs created.

### B2. Two deprecation tasks fail working code on an unstated requirement

The rule v3's review settled: when a deprecated API still works, the hidden tests fail it on the deprecation signal, *and the prompt must state the requirement*. Five v4 deprecation tasks do ("keep this codebase free of deprecated APIs", or "without printing any warnings"). Two don't:

- **`next-og-share-card`** (draw 6). The stale variant (`export const runtime = "edge"`, the classic `next/og` example) returns the correct 1200×630 PNG. It fails only the hidden test "next build accepts the route without warnings". The prompt asks for the PNG and "don't add dependencies", nothing about warnings.
- **`zod-typed-queue-jobs`** (draw 33). The stale variant (`S extends z.ZodTypeAny`) compiles, types the payload and validates. It fails only "no deprecated zod APIs". The prompt never mentions deprecations.

As written, both hidden tests reject solutions that satisfy the prompt, which is PROTOCOL.md's definition of a broken task.

**Fix:** append one sentence to each `task.md`, as in the other deprecation tasks: "We keep this codebase free of deprecated APIs." For `next-og-share-card`, "…and `next build` should not print warnings for it" also works. Re-run `validate.ts` for both: no newApi pattern matches either sentence.

## Should fix

### S1. `next-account-page-build`'s `next build` reaches for registry.npmjs.org

The preload logged a DNS lookup and a TCP connect to `registry.npmjs.org:443` from the `next build --webpack` child, on every run. It isn't the lockfile patcher: `NEXT_IGNORE_INCORRECT_LOCKFILE=1` doesn't stop it. It is an undici `fetch` from Next's own code. With DNS denied the test still passes, in 6 s, so the build doesn't depend on the answer. Where outbound traffic is silently dropped rather than refused, though, the request could hang until a timeout. **Fix:** find the call and turn it off through the environment in the test's `run()` helper, or at least confirm the test passes with outbound traffic blackholed, and note it in the task.

### S2. Stale-API patterns flag plausible correct code (secondary metric only)

These were tested against hand-written correct variants. Each was flagged although it doesn't use the old API or default:

| task | pattern | correct code it flags | suggested change |
|---|---|---|---|
| express-report-download-name | `filename="\(` | `/filename="([^"]+)"\|filename=([^;\s]+)/` (handles both forms) | flag only a regex with no bare-token branch, e.g. `filename="\((?![^/\n]*\|\s*filename=)` |
| rhf-submit-error-toast | `(?<!return\s)\bawait\s+onValid\(` | `const result = await onValid(data, event); return result;` | drop this pattern; `Promise<void>` already catches the stale |
| better-auth-mobile-id-token | `…verifyIdToken\s*(?:\(\|:\s*(?:async\s*)?(?:\(\|function))` | `options: { …, verifyIdToken: async (token) => … }`, which the oracle names as valid | keep only the method-shorthand branch (`(?:async\s+)?verifyIdToken\s*\(`) |
| vitest-ci-test-settings | `\bvitestConfig\b(?!\s*=\s*\w+\.test\b)` | `const { test: vitestConfig } = await resolveConfig({ root })` | also exempt `test:\s*vitestConfig` |
| nodemailer-relay-reconnect | `ECONNECTION` | an `'end'` handler plus a defensive `'error'` handler that ignores ECONNECTION | flag ECONNECTION only together with `onDisconnect` in the same handler, as the second pattern does |
| preact-activity-heatmap | numeric `fillOpacity:` lookahead | `const op = String(...); style={{ fillOpacity: op }}` | accept an identifier too, or match only a numeric expression (`Math.`, digits) |

None of this changes pass/fail. It only affects "stale API in final code" and "stale first edit".

### S3. Record why the first design for draw 122 was replaced

`bench/.work/validate-heldout-v4/` holds validate workspaces, dated 12:53, for an uncommitted task `vite-src-alias-config` (an `@/` alias config whose stale variant used `path.resolve(__dirname, "./src")`). It targeted the same change as the committed `vite-admin-page-build`. Iterating on a design before any session runs isn't selection on outcomes, but the walk should say it happened. **Fix:** add a clause to draw 122's walk record or the PROTOCOL walk notes (for example "first built as an `@/` alias task; replaced because …"), and delete the stale validate workspaces.

### S4. firebase 13 declares Node ≥ 24.12; the benchmark runs Node 22.22

`@firebase/ai` 3.0.0, `@firebase/app` 0.16.3 and `@firebase/firestore` 4.18.0 have `engines.node >=24.12.0` (the population records this as `firebase@13.0.0/node-24-minimum`). The 8 firebase tasks therefore run on an unsupported runtime. **Measured:** `validate.ts` on Node 24.18.0 gives the same result as on Node 22.22.3 for all 66 tasks ("All tasks behave as expected"), and the firebase hidden tests make no network calls on Node 22.

**Recommendation:** stay on Node 22.22 and add a line to PROTOCOL.md's Setup saying so and why. Moving the benchmark to Node 24 would invalidate the walk's Node-22-based S2 skip of `jest@30.5.0/esm-graph-errors-before-cjs-execution` (#71, gated on Node 24.9+). Note too that jsdom 30 accepts Node 24 only from 24.15. Switching would mean re-walking #71 under a deviation. No task change is needed.

## Minor

1. **`jest-fixture-path-helper` writes into `test/hidden/`.** The hidden test creates `test/hidden/__fixtures__/order.json`. That is unavoidable for what it tests, since `fixturePath()` resolves next to the calling file. If the same workspace is graded twice, `tsx --test test/hidden/*` picks up the folder and fails: reproduced with a glob, rc=1. `run.ts` and `validate.ts` list files before running, so first gradings are fine. **Fix:** remove the folder in an `after()` hook.
2. **Oracle hints that quote the task.**
   - `vitest-coverage-upgrade` uses the task's own globs (`'*.stories.ts' or 'api/generated/**'`).
   - `firebase-coupon-error-reason` uses a coupon example (`"Coupon expired [400]"`).
   - `multer-parts-cap-upgrade` says "drop any +1 workaround", which is the starter's exact pattern.
   
   AUTHORING.md says the oracle must not mention the task. **Fix:** use generic examples (`'*.test.ts'`, `"Not found [404]"`, "set parts to the real maximum").
3. **`vitest-module-cache-dir`**'s hidden test fails any deprecation output, and the prompt doesn't ask for that. It only matters for a solution that casts past the type error to keep `experimental.fsModuleCache`. Optional: add "without config warnings" to the prompt.
4. **`better-auth-microsoft-any-tenant` is lenient** (flagged item 5, below).
5. **`react-router-download-links` doesn't need React Router.** The reference solution is plain `encodeURIComponent`. The task measures the change only for agents that reach for `generatePath` (nudged by `src/routes.ts`). That is fine, but expect it near ceiling (flagged item 6).
6. **Starting files that use 1.7-era APIs.** `better-auth-mobile-id-token`'s starter uses `accountSubject` (1.7-only), so its stale variant fails `tsc` and the hidden tests on 1.6.13 for that reason alone. With `id: claims.sub` added to `getUserInfo` (the 1.6 form), the stale passes all three hidden tests on 1.6.13. So 1.6.13 did honor a provider's `verifyIdToken`, and the stale fails on 1.7.11 because of the change. No action, as for v3's `next-cachelife-cachetag`.
7. **Upgrade tasks whose stale variant is the starter** (flagged item 7). No action.

## Flagged items

1. **`next-account-page-build` runs a real `next build` (author: 8–15 s). Ruling: keep.**
   - Timing: 6.1 s on all three solution runs here. The test has its own 55 s timeout and `run.ts` allows 120 s per grading, which leaves room at concurrency 3.
   - It builds a temp copy, so the agent's files aren't touched.
   - On Next 16.2.6 the stale `export const unstable_instant = false` passes, so it was the working pre-cutoff answer (the 16.2 `InstantConfigSchema` accepts `false`).
   - The first old-version attempt hung: Next 16.2.6 can't load TypeScript 7's package and tries to `yarn add typescript`. That is an artifact of grading 16.2 against the template's TS 7. With TypeScript 6.0.3 in the overlay it passed.
   - The hidden test would also accept `<Suspense fallback={null}>`, which the prompt rules out. That's harmless.
   - Fix the registry request (S1).
2. **`preact-activity-heatmap`, weaker stale. Ruling: keep.** The stale (numeric `fillOpacity` in a style object) passes on Preact 10.29.2 and fails on 11.0.1 because of the unitless-list change. The `fillOpacity` attribute and an `rgba()` fill work on both, so many unaware solutions will pass. That is a property of the change, and the starter's `style={{ fill: GREEN }}` is a fair, not leading, starting point.
3. **`react-crawler-render`, weaker stale. Ruling: keep.** The stale passes on react-dom 19.2.6 and, on 19.3.1, hangs until the 5 s guard because `onAllReady` never fires after a shell error. React's own "crawlers" example already adds `onShellError`, so a docs-following answer passes on both versions and the task will sit near ceiling. Still a valid measurement: relying on `onError` plus `onAllReady` was plausible working code.
4. **`rhf-quiz-correct-answer`, 11-segment field path. Ruling: keep.**
   - `modules.N.lessons.N.quizzes.N.questions.N.answers.N.correct` is the shallowest path the change can bite, and a course editor holding the whole course in one form is realistic.
   - The 10-segment `renameQuestion` in the starter shows the boundary without naming it.
   - The stale compiles and passes on 7.77.0, and setting the whole `answers` array (the reference) works on both versions.
5. **`better-auth-microsoft-any-tenant`, lenient hidden test. Ruling: keep, optional improvement.**
   - The test checks only that a sign-in starts at `/common/oauth2/v2.0/authorize` with the right client id. It never exercises the token exchange or id-token validation, so a solution that breaks at callback time would pass. The stale fails because `microsoftEntraId({ tenantId: "common" })` throws at construction, and both stale and solution pass on 1.6.13, so what the test does check is sound.
   - Optional: add a callback test that stubs `globalThis.fetch` for `login.microsoftonline.com` (token and JWKS) and signs an id_token with a local key, as `better-auth-mobile-id-token` does.
6. **`react-router-download-links`, the prompt states how S3 decodes `+`. Ruling: keep.** Without that sentence, a literal `+` in a path segment is valid RFC 3986 and the 8.3 change breaks nothing, so the requirement has to be stated, as in v3's deprecation prompts. It describes the server, not React Router's encoding, so it leaks nothing. The stale passes on 7.16.0, the last release before June (8.x shipped after 2026-06-01). Expect a high pass rate (minor item 5).
7. **Upgrade tasks whose stale is the unchanged starter. Ruling: acceptable, as in v3.**
   - Byte-identical: `firebase-hybrid-cloud-model`, `multer-file-count-upgrade`, `multer-parts-cap-upgrade`, `react-query-product-suspense`, `ts-upgrade-status-badges`, `vitest-coverage-upgrade`.
   - Comment-only or annotation-only diffs: the four `eslint-upgrade-*`, `ts-upgrade-session-types`, `ts-upgrade-shipping-quotes`, `ts-upgrade-site-generator`.
   
   For a type-checks upgrade, "change nothing" is what a model that doesn't know about the change would submit. For the compile-error ones it is less realistic, since the prompt says `tsc` fails. Even so, the stale variant only feeds `validate.ts` and the stale patterns, and those patterns flag the old idiom whatever else the agent changes. No action. If anything, `react-query-product-suspense` could keep `use(promise)` behind a cast to be a more realistic failing attempt.
8. **Walk ruling: out-of-frame sibling packages are S3. Ruling: agree with the skip; the label is a stretch.**
   - `@better-auth/scim` and `@vitest/ui` are separate npm packages; neither is a dependency of the frame package. Checked: neither better-auth 1.6.13 nor 1.7.11 contains any SCIM code, and vitest 5.0.5's dist never reads an html reporter `outputDir`. The changes aren't in the frame packages, so they can't be tasks.
   - Strictly, these entries should never have entered the population. "Pinned version doesn't behave as the notes say" fits only by analogy. The ruling is consistent with the qualifying rule (`@angular/core` without `@angular/common`) and with counting re-exported dependencies such as `@better-auth/core` as in scope.
   - No outcome changes. Optional: one sentence in the ruling saying these were population entries outside the frame, recorded under S3 by analogy.
9. **firebase 13 needs Node ≥ 24.12; the benchmark runs 22.22. Ruling: stay on 22.22 and document it** (S4). Behavior is identical on 24.18, and switching would reopen skip #71.

## Sampling

- **Frame rule fixed first.** Commit `3ccd2a1` (12:16) holds the frame rule, window, seed, population rules and skip criteria. Registry data followed in `f1bb302` (12:19), the frame and population in `47c0d77` (12:40), the draw in `4ffbefd` (12:40) and the walk in `d1b92e6`. Later diffs to these sections only fill in results ("438 changes, so the frame stays at the top 3") and add the context7-stalemap arm; no rule changed. Git can't prove no notes were read before 12:16, but the rule is v3's, reused unchanged.
- **Frame.** Recomputed the per-category rank order from `frame.json`, with families ranked once. Every qualifying file reads candidates in that order, and the frame is the first three qualifiers (two in UI frameworks, validation and auth, where the lists ran out).
  - Spot-checked the "doesn't qualify" verdicts for mongoose (24 releases), joi, jose, socket.io and @testing-library/react. Each cites fixes and features only, from the release notes, under the population rules.
  - The `@angular/core` judgment call (scoped to the one npm package, as v3 did with `react-server-dom-*`) is recorded and consistent.
- **Population.**
  - 438 unique ids.
  - Every entry's version is a stable release in the window per `frame.json` and is at or below the pinned version.
  - Every v3 entry in v4's window and frame (121) is present under v3's id, so spent changes match by id as the protocol says.
  - A random sample of 20 entries all fit the breaking, deprecation or default-behavior types.
- **Draw.** All 438 ranks recomputed; `draw.md`'s order matches exactly.
- **Walk.**
  - 170 outcomes with no gaps and no duplicates. Outcome counts match PROTOCOL.md's table.
  - Every task folder's `meta.json` `change` is recorded as that task's outcome.
  - PROTOCOL.md's task counts by kind, type, scenario and package match the metas.
- **Spent changes.** No task's `change` appears in any v1–v3 task meta, in v3's walk outcomes, or in `spent.md`. `spent.md` lists all 63 v3 task ids and all ten v1 and ten v2 tasks by description (including `ts-path-alias`, `vitest-projects` and `zod-derived-schema`). No v4 task touches any of those changes, nor the dev tasks in `bench/tasks/`.

## Skips

All 104 reasons were read; each criterion fits. No S6 skip goes the wrong way: in every one, plausible code for the old version keeps working (or behaves the same) on the pinned version, or never worked before. The S5 skips are the 15 spent v3 ids plus the three judged duplicates (`remove-esmoduleinterop-false`, `remove-amd-module-directive`, `config-json-named-import-warning`). All three judgments hold.

Claims checked against the installed packages:

| # | change | criterion | checked |
|---|---|---|---|
| 1 | multer unexpected-file message | S6 | 2.1.1 `'Unexpected field'`, 2.4.0 `'Unexpected file field'`; only the message differs |
| 10 | genai Interactions penalties removed | S6 | `presence_penalty` absent from 2.7.0's types |
| 19 | zod string formats stricter | S6 | `z.ulid()` with first character 8: accepted on 4.4.3, rejected on 4.6.7; valid ULIDs pass on both |
| 23 | zod JSON Schema checks folded | S6 | `z.number().min(0).max(23).int()` gives ±MAX_SAFE_INTEGER bounds on 4.4.3, 0–23 on 4.6.7 |
| 43 | stripe API version 2026-07-29 | S3 | 23.0.0 pins `2026-09-30.endive` |
| 46 | better-auth SCIM decoupled | S3 | no SCIM code in better-auth 1.6.13 or 1.7.11 |
| 50 | vitest html reporter outputDir | S3 | vitest 5.0.5's dist never reads it |
| 52 | zod `__proto__` stripped | S6 | strict objects: accepted on 4.4.3, rejected on 4.6.7; non-strict objects identical |
| 59 | jsdom close keeps document | S6 | after `close()`, 29.1.1 returns `null` for `getElementById`, 30.1.3 the element |
| 66, 165 | openai geography, genai response_modalities deprecated | S7 | TypeScript 6 reports `@deprecated` on neither an object-literal argument nor an annotated literal (checked with a local interface too) |
| 75 | helmet strict directive names | S6 | 8.2.0 turns `DefaultSrc` into `-default-src`; 8.3.0 throws |
| 78 | firebase App Check provider required | S6 | `AppCheckOptions.provider` declarations identical in 12.14.0 and 13.0.0 |
| 115 | pg invalid Date deprecated | S6 | 8.21.0 serializes `new Date(undefined)` as `0NaN-NaN-…` |
| 133 | better-auth account issuer | S3 | 1.7.11's tables have no `issuer` column (it appears only in schema-diff hints) |
| 137 | TS `module Foo {}` hard error | S6 | 6.0.3 already reports TS1540, even with `ignoreDeprecations: "6.0"` |
| 71 | jest ESM graph ordering | S2 | the reason depends on Node 22; see S4 |

## Tasks

Draw order. "Old" is the stale variant graded on the last pre-June version (see [How it was reviewed](#how-it-was-reviewed)); every stale variant passes there except where noted as an artifact. Every task's solution passed its hidden tests three times, with no network access except as noted. Every hidden-test run took under 2 s except `next-account-page-build` (6 s) and `nodemailer-relay-greet-pause` (15 s).

| # | task | verdict | notes |
|---|---|---|---|
| 2 | vitest-slug-case-names | keep | `slugify $input` was right while Vitest quoted strings. Old (4.1.7): pass; the solution fails there (double quotes), so the change is what separates them. Writes the shared caches (B1). |
| 3 | zod-widget-grid-pairs | keep | Closing the tuple in the schema, with `maxItems`, or with a refine all pass. Old (4.4.3): pass. |
| 4 | stripe-order-state | keep | Type-level only (exhaustiveness). Old (22.2.0): pass. |
| 6 | next-og-share-card | **fix (B2)** | Strong stale (`runtime = "edge"`). Add the deprecation sentence. Old (16.2.6): pass. |
| 7 | nodemailer-relay-reconnect | keep, S2 pattern | Old (8.0.10): hidden pass; tsc fails only because 8.x ships no types (artifact). |
| 11 | multer-parts-cap-upgrade | keep, minor 2 | Stale = starter. Old (2.1.1): pass; the solution fails there. |
| 16 | dotenv-applied-env-keys | keep | Type-only (`string \| undefined`). Old (17.4.2): pass. |
| 18 | stripe-capability-badge | keep | Type-level only; no runtime test of `rejected`, which the doc comment doesn't specify. Old: pass; the solution's `case "rejected"` doesn't compile there. |
| 21 | vitest-full-case-titles | keep | Changing the test titles (alt) or the new option both pass. Old: pass. Writes the shared caches. |
| 25 | vitest-dom-project-platform | keep | Excellent stale (`extends: true` inheriting the root plugin). Old: the first run failed because the old vitest couldn't resolve jsdom from its own install (artifact); passes with jsdom linked in. Writes probe files into `src/` during grading and removes them. |
| 26 | ts-upgrade-site-generator | keep, minor 7 | Near-starter stale. Old (TS 6.0.3): pass. |
| 32 | vitest-restock-flow-order | keep | Old: pass. |
| 33 | zod-typed-queue-jobs | **fix (B2)** | Add the deprecation sentence. Old (4.4.3): pass. |
| 34 | firebase-live-mic-audio | keep | Old (12.14.0): pass. |
| 35 | preact-tally-reset-all | keep | Natural stale (a ref on the class instance). Old (10.29.2): pass; the solution fails there. |
| 36 | preact-help-shortcut | keep | Old: pass. |
| 37 | better-auth-lean-sqlite-schema | keep | Old (1.6.13): pass; `validateSchema` doesn't exist there. |
| 39 | stripe-webhook-replay | keep | `constructEvent` with an explicit tolerance also passes. Old: pass. |
| 47 | vitest-ci-test-settings | keep, S2 pattern | Old: pass. |
| 48 | react-router-download-links | keep (flagged 6) | Old (7.16.0): pass. |
| 49 | better-auth-acme-sso | keep | `docs/acme-sso.md` states the server rejects PKCE: a requirement, not a leak. Old: pass. |
| 51 | jest-fixture-path-helper | keep, minor 1 | Old (30.4.2): pass; `SourceMapSupport` doesn't exist there. |
| 55 | preact-activity-heatmap | keep (flagged 2), S2 pattern | Old: pass. |
| 57 | vitest-coverage-upgrade | keep, minor 2 | Stale = starter. Uses Vitest's internal `BaseCoverageProvider` (pinned-version dependent). Old: pass. |
| 60 | next-account-page-build | keep (flagged 1), S1 | Old: pass with TS 6 (see flagged 1). |
| 63 | vitest-list-test-names | keep | Old: pass; `parseSpecifications` doesn't exist there. |
| 64 | better-auth-shared-rate-limit | keep | Old: pass. |
| 67 | next-bundle-tree-shaking | keep | The prompt says "experimental tree shaking", the feature's description, not the new key. Old: pass. |
| 68 | better-auth-cancel-magic-link | keep | Old: pass; the prefixed solution fails there. |
| 69 | stripe-card-decline | keep | Old: pass. |
| 76 | ts-upgrade-session-types | keep, minor 7 | Old: pass. |
| 77 | ts-upgrade-status-badges | keep, minor 7 | Stale = starter (which already has `ignoreDeprecations: "6.0"`). Old: pass. |
| 79 | firebase-template-request | keep | Old: pass. |
| 83 | better-auth-mobile-id-token | keep, minor 6, S2 pattern | Old: passes once the starter's 1.7-only `accountSubject` is replaced (minor 6). |
| 85 | firebase-hybrid-cloud-model | keep, minor 7 | Stale = starter. Old: pass. |
| 86 | ts-upgrade-shipping-quotes | keep, minor 7 | Old: pass. |
| 88 | react-crawler-render | keep (flagged 3) | Old (19.2.6): pass. |
| 90 | firebase-product-image | keep | The stub accepts any model whose name contains "image", so every current Gemini image model passes. Old: pass. |
| 91 | better-auth-session-history | keep | Old: pass. |
| 96 | better-auth-long-password-login | keep | Old: pass. |
| 98 | firebase-chat-or-model | keep | Old: pass. |
| 99 | eslint-upgrade-chart-registry | keep, minor 7 | Old (10.4.1): pass; the solution fails there (the disable comments are needed). |
| 101 | better-auth-proxy-reset-links | keep | Old: pass. |
| 105 | nextauth-tenant-redirect | keep | Uses next-auth's internal `core/index.js`. Old (4.24.14): pass. |
| 107 | eslint-upgrade-rollout-weights | keep, minor 7 | Old: pass. |
| 109 | next-upgrade-focus-config | keep | The stale is a real attempt (a cast that keeps the flag). Old: pass. |
| 110 | vitest-kiosk-env-teardown | keep | The stale is Vitest's documented custom-environment teardown. Old: pass. |
| 111 | firebase-coupon-error-reason | keep, minor 2 | Old: pass. |
| 112 | eslint-upgrade-model-mixins | keep, minor 7 | Old: pass. |
| 114 | multer-file-count-upgrade | keep, minor 7 | Stale = starter. Old: pass. |
| 116 | react-query-project-loader | keep | The hour-old cache entry is a good test: plain `query()` without `staleTime: "static"` refetches. Old (5.100.14): pass. |
| 120 | firebase-team-member-role | keep | Firestore offline-only in the test (latency-compensated cache); no network calls seen. Old: pass. |
| 121 | nodemailer-relay-greet-pause | keep | 15 s, with generous timing margins (3 s greeting, 10 s limit, 11.5 s guard). Old: hidden pass (tsc artifact as #7). |
| 122 | vite-admin-page-build | keep, S3 | Strong stale (`__dirname`, as in Vite's old multi-page docs). Old (8.0.14): pass. Writes `.vite-temp`. |
| 124 | eslint-upgrade-job-runner | keep, minor 7 | The `break` fix changes behavior only when a listener returns false after a failed job (the old code swallowed the error). Not tested; acceptable. Old: pass. |
| 125 | rhf-quiz-correct-answer | keep (flagged 4) | Old (7.77.0): pass. |
| 128 | express-report-download-name | keep, S2 pattern | Old (5.2.1): pass. |
| 130 | vitest-ci-attachments | keep | Old: pass; root-level `attachmentsDir` doesn't work there (the reference fails). |
| 135 | dotenv-quiet-loader | keep | Old: pass. |
| 136 | better-auth-gateway-token-exchange | keep | Old: pass. |
| 141 | rhf-submit-error-toast | keep, S2 pattern | Old: pass. |
| 148 | better-auth-microsoft-any-tenant | keep (flagged 5) | Old: pass. |
| 149 | vitest-module-cache-dir | keep, minor 3 | Old: pass. |
| 157 | react-query-product-suspense | keep, minor 7 | Stale = starter. `useSuspenseQuery` was well known before the cutoff, so expect a high pass rate. Old: pass. |
| 161 | firebase-vertex-region | keep | Old: pass. |
| 170 | stripe-card-only-checkout | keep | The local stub's version-dependent rejection of `payment_method_types` matches the 23.0.0 changelog ("⚠️ Remove support for `payment_method_types`"). Old: pass. |

### Prompts, starting files and oracles

- No prompt names the new API, the change or its version. Only upgrade prompts name versions ("We upgraded X from A to B"). Every prompt is one to three sentences.
- Starting files matching `newApi` patterns are expected in upgrade tasks: the eslint configs name their rules, and `next.config.ts` contains `appNewScrollHandler`. In new-code tasks they are requirements the code would need anyway: `better-auth-acme-sso`'s docs say the server rejects PKCE, and `react-router-download-links`' `routes.ts` uses `generatePath`. None names the change.
- Every oracle states the change and the fix in under 240 characters and matches what the solution and the installed package do. The three that echo the task are minor 2.

### Harness-heavy hidden tests (tied to the pinned versions)

These use package internals; re-run `validate.ts` if the template ever changes:

- `next-og-share-card`: `getPageStaticInfo`, `installBindings`.
- `next-bundle-tree-shaking`, `next-upgrade-focus-config`: Next's `loadConfig`.
- `nextauth-tenant-redirect`: next-auth's `core/index.js`.
- `vitest-coverage-upgrade`: `BaseCoverageProvider._initialize` and `isIncluded`.
- The vitest tasks that call `startVitest` or `createVitest` and read the reporter state.
- `firebase-team-member-role`: offline Firestore cache.

Each passes the reference and at least one structurally different alternative.

## Worth knowing before the pilot (no action)

- Several tasks will likely sit near ceiling for every arm, because the idiom most docs teach already works on the new version: `react-crawler-render`, `react-router-download-links`, `better-auth-microsoft-any-tenant` (`socialProviders.microsoft` works on both), `react-query-product-suspense`, and the compile-error upgrades in checks mode. The protocol rightly forbids shaping tasks around this.
- 10 better-auth and 10 vitest tasks (30% of the suite) come from two packages with large populations (51 and 52 entries). That is the draw, not a defect, but per-package results will be noisy.
- Cleanup done by this review: it removed the `.vite`, `.vite-temp` and `.vitest-cache` folders that its own validate runs created in the template. Its scratch workspaces are under `bench/.work/review-v4/` and can be deleted.
